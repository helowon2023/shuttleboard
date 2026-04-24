'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Block, Entry, Match } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { computeStandings } from '@/lib/logic/standings'
import { Modal } from '@/components/ui/Modal'
import { ScoreInput } from '@/components/individual/ScoreInput'

interface BracketMatch extends Match {
  entry1?: Entry
  entry2?: Entry
  roundLabel: string
  posInRound: number   // 0-indexed position within this round
}

// ブロック内の位置からラウンドラベルを返す
function getRoundLabel(totalSlots: number, round: number): string {
  const finals = totalSlots / 2
  if (round >= finals) return '決勝'
  if (round >= finals / 2) return '準決勝'
  if (round >= finals / 4) return '準々決勝'
  return `${round}回戦`
}

// シードテーブル: N人のとき各シードをどのスロットに配置するか
// 例: 4人 → [0,3,1,2] (1位vs4位, 2位vs3位が決勝で当たるよう)
function buildSeedSlots(size: number): number[] {
  if (size === 1) return [0]
  const half = size / 2
  const left = buildSeedSlots(half)
  const right = buildSeedSlots(half)
  const result: number[] = []
  for (let i = 0; i < left.length; i++) {
    result.push(left[i])
    result.push(right[i] + half)
  }
  return result
}

export default function FinalsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCatId, setSelectedCatId] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [allEntries, setAllEntries] = useState<Entry[]>([])
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [finalsBlock, setFinalsBlock] = useState<Block | null>(null)
  const [finalsEntries, setFinalsEntries] = useState<Entry[]>([])
  const [finalsMatches, setFinalsMatches] = useState<BracketMatch[]>([])
  const [advanceCount, setAdvanceCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const { showToast, ToastContainer } = useToast()

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: t } = await supabase.from('tournaments').select('id').order('created_at', { ascending: false }).limit(1)
    const tourId = t?.[0]?.id
    if (!tourId) { setLoading(false); return }
    const { data: cats } = await supabase.from('categories').select('*').eq('tournament_id', tourId).order('sort_order')
    setCategories(cats ?? [])
    if (cats && cats.length > 0 && !selectedCatId) setSelectedCatId(cats[0].id)
    setLoading(false)
  }, [selectedCatId])

  const loadCategory = useCallback(async (catId: string) => {
    if (!catId) return
    const supabase = createClient()
    const { data: blks } = await supabase.from('blocks').select('*').eq('category_id', catId).order('name')
    const regular = (blks ?? []).filter(b => b.block_type !== 'finals')
    const finals = (blks ?? []).find(b => b.block_type === 'finals') ?? null
    setBlocks(regular)
    setFinalsBlock(finals)

    if (regular.length > 0) {
      const blockIds = regular.map(b => b.id)
      const [{ data: ents }, { data: matches }] = await Promise.all([
        supabase.from('entries').select('*').in('block_id', blockIds).order('sort_order'),
        supabase.from('matches').select('*').in('block_id', blockIds),
      ])
      setAllEntries(ents ?? [])
      setAllMatches(matches ?? [])
    }

    if (finals) {
      const { data: fEnts } = await supabase.from('entries').select('*').eq('block_id', finals.id).order('sort_order')
      setFinalsEntries(fEnts ?? [])
      const { data: fMatches } = await supabase.from('matches').select('*').eq('block_id', finals.id).order('match_order')
      const entMap = new Map((fEnts ?? []).map(e => [e.id, e]))
      // ラウンドごとに posInRound を計算
      const sorted = (fMatches ?? []).slice().sort((a, b) => a.match_order - b.match_order)
      const roundCounts = new Map<number, number>()
      sorted.forEach(m => {
        const cnt = roundCounts.get(m.round) ?? 0
        roundCounts.set(m.round, cnt + 1)
      })
      const roundIdx = new Map<number, number>() // round → next index
      const total = fEnts?.length ?? 0
      // 2のべき乗サイズを計算（roundLabel用）
      let size = 1; while (size < total) size *= 2
      const bm: BracketMatch[] = sorted.map(m => {
        const pos = roundIdx.get(m.round) ?? 0
        roundIdx.set(m.round, pos + 1)
        return {
          ...m,
          entry1: m.entry1_id ? entMap.get(m.entry1_id) : undefined,
          entry2: m.entry2_id ? entMap.get(m.entry2_id) : undefined,
          roundLabel: getRoundLabel(size, m.round),
          posInRound: pos,
        }
      })
      setFinalsMatches(bm)
    } else {
      setFinalsEntries([])
      setFinalsMatches([])
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (selectedCatId) loadCategory(selectedCatId) }, [selectedCatId, loadCategory])

  // ブロック上位取得（最大10ブロック対応）
  function getTopEntries(): Entry[] {
    const result: Entry[] = []
    for (const block of blocks) {
      const blockEntries = allEntries.filter(e => e.block_id === block.id)
      const blockMatches = allMatches.filter(m => m.block_id === block.id)
      const standings = computeStandings(blockEntries, blockMatches)
      for (let i = 0; i < Math.min(advanceCount, standings.length); i++) {
        result.push(standings[i].entry)
      }
    }
    return result
  }

  // シングルエリミネーション生成（bye付き、10ブロック最大20名対応）
  function buildBracketMatches(
    participants: Entry[]
  ): { entry1: Entry | null; entry2: Entry | null; round: number; match_order: number }[] {
    const n = participants.length
    let size = 1
    while (size < n) size *= 2

    // シード配置
    const slots: (Entry | null)[] = Array(size).fill(null)
    const seedOrder = buildSeedSlots(size)
    for (let i = 0; i < n; i++) slots[seedOrder[i]] = participants[i]

    const matches: { entry1: Entry | null; entry2: Entry | null; round: number; match_order: number }[] = []
    let matchOrder = 0

    // 1回戦（byeは不戦勝）
    for (let i = 0; i < size; i += 2) {
      matches.push({
        entry1: slots[i],
        entry2: slots[i + 1],
        round: 1,
        match_order: matchOrder++,
      })
    }

    // 2回戦以降（TBD枠）
    let prevCount = size / 2
    let round = 2
    while (prevCount > 1) {
      const nextCount = Math.ceil(prevCount / 2)
      for (let i = 0; i < nextCount; i++) {
        matches.push({ entry1: null, entry2: null, round, match_order: matchOrder++ })
      }
      prevCount = nextCount
      round++
    }
    return matches
  }

  async function generateFinals() {
    setGenerating(true)
    const supabase = createClient()
    const topEntries = getTopEntries()

    if (topEntries.length < 2) {
      showToast('決勝進出者が2名以上必要です', 'error')
      setGenerating(false)
      return
    }

    // 既存の決勝ブロックを削除
    if (finalsBlock) {
      await supabase.from('matches').delete().eq('block_id', finalsBlock.id)
      await supabase.from('entries').delete().eq('block_id', finalsBlock.id)
      await supabase.from('blocks').delete().eq('id', finalsBlock.id)
    }

    // 新しい決勝ブロックを作成
    const { data: newBlock, error: blkErr } = await supabase
      .from('blocks').insert({ category_id: selectedCatId, name: '決勝トーナメント', block_type: 'finals' }).select().single()
    if (blkErr || !newBlock) { showToast('ブロック作成エラー: ' + blkErr?.message, 'error'); setGenerating(false); return }

    // 決勝エントリー登録
    const { data: insertedEntries, error: entErr } = await supabase
      .from('entries')
      .insert(topEntries.map((e, i) => ({ block_id: newBlock.id, name: e.name, club: e.club, player2: e.player2, sort_order: i })))
      .select()
    if (entErr || !insertedEntries) { showToast('エントリー登録エラー', 'error'); setGenerating(false); return }

    // ブラケット生成
    const bracket = buildBracketMatches(insertedEntries)
    const matchData = bracket.map(b => ({
      block_id: newBlock.id,
      entry1_id: b.entry1?.id ?? null,
      entry2_id: b.entry2?.id ?? null,
      round: b.round,
      match_order: b.match_order,
      status: b.entry2 === null && b.entry1 !== null ? '不戦勝' :
              b.entry1 && b.entry2 ? '未試合' : 'TBD',
    }))

    // 不戦勝の場合は winner_id を設定
    const matchDataWithWinners = matchData.map((m, idx) => {
      if (m.status === '不戦勝') {
        return { ...m, winner_id: bracket[idx].entry1?.id ?? null }
      }
      return m
    })
    await supabase.from('matches').insert(matchDataWithWinners)

    showToast(`決勝トーナメント生成完了（${topEntries.length}名）`)
    setGenerating(false)
    loadCategory(selectedCatId)
  }

  async function handleScoreSubmit(score1: number, score2: number, court: string) {
    if (!selectedMatch) return
    const supabase = createClient()
    const winner_id = score1 > score2 ? selectedMatch.entry1_id : selectedMatch.entry2_id
    const winner = score1 > score2 ? selectedMatch.entry1 : selectedMatch.entry2

    await supabase.from('matches').update({
      score1, score2, winner_id, court: court || null, status: '終了',
      played_at: new Date().toISOString(),
    }).eq('id', selectedMatch.id)

    // 次ラウンドの試合に勝者をセット
    if (winner && finalsBlock) {
      const nextRound = selectedMatch.round + 1
      // 同じラウンドの試合を match_order でソートして posInRound を特定
      const sameRound = finalsMatches
        .filter(m => m.round === selectedMatch.round)
        .sort((a, b) => a.match_order - b.match_order)
      const posInRound = sameRound.findIndex(m => m.id === selectedMatch.id)

      // 次ラウンドの試合
      const nextRoundMatches = finalsMatches
        .filter(m => m.round === nextRound)
        .sort((a, b) => a.match_order - b.match_order)
      const nextMatchPos = Math.floor(posInRound / 2)
      const nextMatch = nextRoundMatches[nextMatchPos]

      if (nextMatch) {
        const isEntry1Slot = posInRound % 2 === 0
        await supabase.from('matches').update(
          isEntry1Slot ? { entry1_id: winner.id, status: '未試合' } : { entry2_id: winner.id, status: '未試合' }
        ).eq('id', nextMatch.id)
      }
    }

    showToast('スコアを保存しました')
    setSelectedMatch(null)
    loadCategory(selectedCatId)
  }

  const rounds = Array.from(new Set(finalsMatches.map(m => m.round))).sort((a, b) => a - b)
  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 0

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>

  const topEntries = getTopEntries()

  return (
    <div className="space-y-5 pb-10">
      <ToastContainer />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .bracket-scroll { overflow: visible !important; }
        }
      `}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🏆 決勝トーナメント</h1>
        {finalsBlock && (
          <button onClick={() => window.print()} className="no-print text-xs bg-gray-100 text-gray-600 rounded-xl px-3 py-2">
            🖨️ 印刷
          </button>
        )}
      </div>

      {/* 種目タブ */}
      <div className="no-print flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCatId(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedCatId === cat.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* 予選ブロック状況 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="font-bold text-sm">予選ブロック状況（{blocks.length}ブロック）</div>
        {blocks.length === 0 && <div className="text-gray-400 text-sm">ブロックがありません</div>}
        <div className="grid grid-cols-1 gap-2">
          {blocks.map(block => {
            const bEntries = allEntries.filter(e => e.block_id === block.id)
            const bMatches = allMatches.filter(m => m.block_id === block.id)
            const standings = computeStandings(bEntries, bMatches)
            const doneCount = bMatches.filter(m => m.status === '終了').length
            const allDone = bMatches.length > 0 && doneCount === bMatches.length
            return (
              <div key={block.id} className={`rounded-xl p-3 ${allDone ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-bold">{block.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {allDone ? '✅ 完了' : `${doneCount}/${bMatches.length}試合`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {standings.slice(0, advanceCount).map((s, i) => (
                    <span key={s.entry.id} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                      {i + 1}位: {s.entry.name}
                    </span>
                  ))}
                  {standings.slice(advanceCount).map(s => (
                    <span key={s.entry.id} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-400">{s.entry.name}</span>
                  ))}
                  {standings.length === 0 && <span className="text-xs text-gray-400">エントリーなし</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 決勝生成設定 */}
      {!finalsBlock && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4 no-print">
          <div className="font-bold">決勝トーナメント生成</div>
          <div>
            <div className="text-sm text-gray-600 mb-2">各ブロックから何位まで進出？</div>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => setAdvanceCount(n)}
                  className={`flex-1 rounded-xl py-2 font-bold border ${advanceCount === n ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
                  {n}位まで
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-bold text-gray-500 mb-2">
              決勝進出者（{topEntries.length}名）
              {topEntries.length > 0 && (() => {
                let sz = 1; while (sz < topEntries.length) sz *= 2
                const byes = sz - topEntries.length
                return byes > 0 ? ` ／ シードbye: ${byes}名` : ''
              })()}
            </div>
            <div className="flex flex-wrap gap-1">
              {topEntries.length === 0
                ? <span className="text-xs text-gray-400">（予選結果を入力してください）</span>
                : topEntries.map((e, i) => (
                    <span key={e.id} className="text-xs bg-white border border-primary/30 text-primary rounded-full px-2 py-1">
                      {i + 1}. {e.name}
                    </span>
                  ))
              }
            </div>
          </div>
          <button onClick={generateFinals} disabled={generating || topEntries.length < 2}
            className="w-full bg-accent text-white rounded-xl py-4 font-bold text-lg disabled:opacity-40">
            {generating ? '生成中...' : `🏆 決勝トーナメントを生成（${topEntries.length}名）`}
          </button>
        </div>
      )}

      {/* 再生成ボタン */}
      {finalsBlock && (
        <div className="no-print flex gap-2">
          <div className="flex gap-2 items-center flex-1">
            <span className="text-xs text-gray-500">進出枠:</span>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setAdvanceCount(n)}
                className={`text-xs rounded-lg px-2 py-1 border ${advanceCount === n ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
                {n}位
              </button>
            ))}
          </div>
          <button onClick={generateFinals} disabled={generating}
            className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 font-bold disabled:opacity-40">
            🔄 再生成
          </button>
        </div>
      )}

      {/* 決勝トーナメント表示 */}
      {finalsBlock && finalsMatches.length > 0 && (
        <div>
          <div className="text-sm font-bold text-gray-700 mb-3">
            決勝トーナメント（{finalsEntries.length}名）
          </div>
          {/* 横スクロールのブラケット表示 */}
          <div className="bracket-scroll overflow-x-auto pb-4">
            <div className="flex gap-0 min-w-max">
              {rounds.map((round, rIdx) => {
                const roundMatches = finalsMatches.filter(m => m.round === round).sort((a, b) => a.posInRound - b.posInRound)
                const isLast = round === maxRound
                const label = roundMatches[0]?.roundLabel ?? `第${round}ラウンド`
                // ラウンドが上がるほど縦に間隔を広げる（2^(round-1)の倍率）
                const spacing = Math.pow(2, rIdx)

                return (
                  <div key={round} className="flex flex-col" style={{ width: 160 }}>
                    {/* ラウンドヘッダー */}
                    <div className={`text-center text-xs font-bold py-2 mb-2 ${isLast ? 'text-accent' : 'text-primary'}`}>
                      {isLast ? '🏆 ' : ''}{label}
                    </div>
                    {/* マッチカード群 */}
                    <div className="flex flex-col" style={{ gap: `${spacing * 8}px`, paddingTop: `${(spacing - 1) * 4}px` }}>
                      {roundMatches.map(m => {
                        const isWon1 = m.status === '終了' && m.winner_id === m.entry1_id
                        const isWon2 = m.status === '終了' && m.winner_id === m.entry2_id
                        const isTBD = !m.entry1_id && !m.entry2_id
                        const isBye = m.status === '不戦勝'
                        return (
                          <div key={m.id}
                            className={`border-2 rounded-xl overflow-hidden cursor-pointer transition-shadow hover:shadow-md mx-1 ${
                              isLast && m.status === '終了' ? 'border-accent' :
                              m.status === '終了' ? 'border-done/50' :
                              isTBD ? 'border-gray-100 opacity-40' :
                              'border-gray-300'
                            }`}
                            onClick={() => {
                              if (m.entry1_id && m.entry2_id && !isTBD) setSelectedMatch(m)
                            }}
                          >
                            {/* Entry 1 */}
                            <div className={`px-2 py-1.5 flex items-center gap-1 border-b border-gray-100 ${isWon1 ? 'bg-primary/10' : ''}`}>
                              {isWon1 && <span className="text-primary text-xs">●</span>}
                              <span className={`text-xs font-medium flex-1 truncate ${isTBD ? 'text-gray-300' : isWon1 ? 'text-primary font-bold' : 'text-gray-700'}`}>
                                {isBye && !m.entry1_id ? 'BYE' : m.entry1?.name ?? 'TBD'}
                              </span>
                              {m.status === '終了' && (
                                <span className={`text-xs font-bold tabular-nums ${isWon1 ? 'text-primary' : 'text-gray-400'}`}>{m.score1}</span>
                              )}
                            </div>
                            {/* Entry 2 */}
                            <div className={`px-2 py-1.5 flex items-center gap-1 ${isWon2 ? 'bg-primary/10' : ''}`}>
                              {isWon2 && <span className="text-primary text-xs">●</span>}
                              <span className={`text-xs font-medium flex-1 truncate ${isTBD ? 'text-gray-300' : isWon2 ? 'text-primary font-bold' : 'text-gray-700'}`}>
                                {isBye ? 'BYE' : m.entry2?.name ?? 'TBD'}
                              </span>
                              {m.status === '終了' && (
                                <span className={`text-xs font-bold tabular-nums ${isWon2 ? 'text-primary' : 'text-gray-400'}`}>{m.score2}</span>
                              )}
                            </div>
                            {/* 不戦勝バッジ */}
                            {isBye && (
                              <div className="bg-gray-100 text-gray-500 text-xs text-center py-0.5">不戦勝</div>
                            )}
                            {/* 決勝勝者 */}
                            {isLast && m.status === '終了' && (
                              <div className="bg-accent/10 text-accent text-xs text-center py-1 font-bold">🏆 優勝</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* リスト形式（補助表示） */}
          <details className="no-print mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer">▶ リスト形式で表示</summary>
            <div className="mt-3 space-y-4">
              {rounds.map(round => {
                const roundMatches = finalsMatches.filter(m => m.round === round).sort((a, b) => a.posInRound - b.posInRound)
                const label = roundMatches[0]?.roundLabel ?? `第${round}ラウンド`
                return (
                  <div key={round}>
                    <div className="text-sm font-bold text-primary mb-2">── {label} ──</div>
                    <div className="space-y-2">
                      {roundMatches.map(m => (
                        <div key={m.id} className={`border rounded-xl p-3 ${m.status === '終了' ? 'bg-green-50 border-green-200' : m.status === 'TBD' ? 'bg-gray-50 border-gray-100 opacity-50' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`flex-1 text-right font-medium ${m.winner_id === m.entry1_id ? 'text-primary font-bold' : ''}`}>{m.entry1?.name ?? 'TBD'}</span>
                            {m.status === '終了'
                              ? <span className="font-bold tabular-nums text-gray-700">{m.score1} - {m.score2}</span>
                              : <span className="text-gray-300 text-xs">vs</span>}
                            <span className={`flex-1 font-medium ${m.winner_id === m.entry2_id ? 'text-primary font-bold' : ''}`}>{m.entry2?.name ?? 'TBD'}</span>
                          </div>
                          {m.entry1_id && m.entry2_id && m.status !== 'TBD' && (
                            <button onClick={() => setSelectedMatch(m)}
                              className="mt-2 w-full bg-primary text-white rounded-lg py-1.5 text-xs font-bold">
                              {m.status === '終了' ? '修正' : '結果入力'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}

      {finalsBlock && finalsMatches.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">🏆</div>
          <div>決勝トーナメントのデータがありません</div>
        </div>
      )}

      {selectedMatch && (
        <Modal title={`${selectedMatch.roundLabel} 結果入力`} onClose={() => setSelectedMatch(null)}>
          <ScoreInput
            match={selectedMatch}
            entry1={selectedMatch.entry1}
            entry2={selectedMatch.entry2}
            onSubmit={handleScoreSubmit}
            onCancel={() => setSelectedMatch(null)}
          />
        </Modal>
      )}
    </div>
  )
}
