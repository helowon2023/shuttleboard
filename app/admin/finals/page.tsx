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
}

const ROUND_LABELS: Record<number, string> = {
  1: '1回戦', 2: '準々決勝', 4: '準決勝', 8: '決勝',
}

function getRoundLabel(totalTeams: number, round: number): string {
  if (round === totalTeams / 2) return '決勝'
  if (round === totalTeams / 4) return '準決勝'
  if (round === totalTeams / 8) return '準々決勝'
  return `${round}回戦`
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

    const blockIds = regular.map(b => b.id)
    if (blockIds.length > 0) {
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
      const total = fEnts?.length ?? 0
      const bm: BracketMatch[] = (fMatches ?? []).map(m => ({
        ...m,
        entry1: m.entry1_id ? entMap.get(m.entry1_id) : undefined,
        entry2: m.entry2_id ? entMap.get(m.entry2_id) : undefined,
        roundLabel: getRoundLabel(total, m.round),
      }))
      setFinalsMatches(bm)
    } else {
      setFinalsEntries([])
      setFinalsMatches([])
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (selectedCatId) loadCategory(selectedCatId) }, [selectedCatId, loadCategory])

  // ブロック上位取得
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

  // シングルエリミネーショントーナメント生成
  function generateBracket(participants: Entry[]): { entry1: Entry | null; entry2: Entry | null; round: number; match_order: number }[] {
    const n = participants.length
    // 2のべき乗に切り上げ
    let size = 1
    while (size < n) size *= 2

    // シード配置（上位シードが反対側に来るよう配置）
    const seeded: (Entry | null)[] = Array(size).fill(null)
    // シンプルにそのまま配置
    for (let i = 0; i < n; i++) seeded[i] = participants[i]

    const matches: { entry1: Entry | null; entry2: Entry | null; round: number; match_order: number }[] = []
    let matchOrder = 0
    // 1回戦のみ生成（その後は試合進行に応じて追加するか、全ラウンド事前生成）
    for (let i = 0; i < size; i += 2) {
      if (seeded[i] !== null || seeded[i + 1] !== null) {
        matches.push({ entry1: seeded[i], entry2: seeded[i + 1], round: 1, match_order: matchOrder++ })
      }
    }

    // 後続ラウンド（TBD枠を作成）
    let prevRoundCount = matches.length
    let round = 2
    while (prevRoundCount > 1) {
      const nextCount = Math.ceil(prevRoundCount / 2)
      for (let i = 0; i < nextCount; i++) {
        matches.push({ entry1: null, entry2: null, round, match_order: matchOrder++ })
      }
      prevRoundCount = nextCount
      round++
    }

    return matches
  }

  async function generateFinals() {
    setGenerating(true)
    const supabase = createClient()
    const topEntries = getTopEntries()

    if (topEntries.length < 2) {
      showToast('決勝進出者が2名以上必要です。予選結果を先に入力してください。', 'error')
      setGenerating(false)
      return
    }

    // 既存の決勝ブロックを削除
    if (finalsBlock) {
      await supabase.from('blocks').delete().eq('id', finalsBlock.id)
    }

    // 新しい決勝ブロックを作成
    const { data: newBlock, error: blkErr } = await supabase
      .from('blocks').insert({ category_id: selectedCatId, name: '決勝トーナメント', block_type: 'finals' }).select().single()
    if (blkErr || !newBlock) { showToast('ブロック作成エラー: ' + blkErr?.message, 'error'); setGenerating(false); return }

    // 決勝エントリーを登録
    const { data: insertedEntries, error: entErr } = await supabase
      .from('entries')
      .insert(topEntries.map((e, i) => ({ block_id: newBlock.id, name: e.name, club: e.club, player2: e.player2, sort_order: i })))
      .select()
    if (entErr || !insertedEntries) { showToast('エントリー登録エラー', 'error'); setGenerating(false); return }

    // ブラケット生成
    const bracket = generateBracket(insertedEntries)
    const matchData = bracket.map(b => ({
      block_id: newBlock.id,
      entry1_id: b.entry1?.id ?? null,
      entry2_id: b.entry2?.id ?? null,
      round: b.round,
      match_order: b.match_order,
      status: b.entry1 && b.entry2 ? '未試合' : (b.entry1 || b.entry2 ? '不戦勝' : 'TBD'),
    }))
    await supabase.from('matches').insert(matchData)

    showToast(`決勝トーナメント生成完了（${topEntries.length}名）`)
    setGenerating(false)
    loadCategory(selectedCatId)
  }

  async function handleScoreSubmit(score1: number, score2: number, court: string) {
    if (!selectedMatch) return
    const supabase = createClient()
    const winner_id = score1 > score2 ? selectedMatch.entry1_id : selectedMatch.entry2_id

    await supabase.from('matches').update({
      score1, score2, winner_id, court: court || null, status: '終了',
      played_at: new Date().toISOString(),
    }).eq('id', selectedMatch.id)

    // 次ラウンドの対応する試合にwinner_idをセット
    const winner = score1 > score2 ? selectedMatch.entry1 : selectedMatch.entry2
    if (winner && finalsBlock) {
      const nextRound = selectedMatch.round + 1
      const nextMatchIdx = Math.floor(selectedMatch.match_order / 2)
      const nextMatches = finalsMatches.filter(m => m.round === nextRound)
        .sort((a, b) => a.match_order - b.match_order)
      const nextMatch = nextMatches[nextMatchIdx - (nextMatches.length > 0 ? Math.floor(finalsMatches.filter(m => m.round === nextRound - 1).length / 2) * (nextRound - 2) : 0)]

      if (nextMatch) {
        const isEntry1 = selectedMatch.match_order % 2 === 0
        await supabase.from('matches').update(
          isEntry1 ? { entry1_id: winner.id } : { entry2_id: winner.id }
        ).eq('id', nextMatch.id)
      }
    }

    showToast('スコアを保存しました')
    setSelectedMatch(null)
    loadCategory(selectedCatId)
  }

  // ラウンド別にグループ化
  const rounds = Array.from(new Set(finalsMatches.map(m => m.round))).sort((a, b) => a - b)

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>

  return (
    <div className="space-y-5 pb-10">
      <ToastContainer />
      <h1 className="text-xl font-bold">🏆 決勝トーナメント</h1>

      {/* 種目タブ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCatId(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedCatId === cat.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* 予選ブロック状況 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="font-bold text-sm">予選ブロック状況</div>
        {blocks.length === 0 && <div className="text-gray-400 text-sm">ブロックがありません</div>}
        {blocks.map(block => {
          const bEntries = allEntries.filter(e => e.block_id === block.id)
          const bMatches = allMatches.filter(m => m.block_id === block.id)
          const standings = computeStandings(bEntries, bMatches)
          const doneCount = bMatches.filter(m => m.status === '終了').length
          return (
            <div key={block.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{block.name}</span>
                <span className="text-gray-400">{doneCount}/{bMatches.length}試合完了</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {standings.slice(0, advanceCount).map((s, i) => (
                  <span key={s.entry.id} className={`text-xs px-2 py-1 rounded-full ${i === 0 ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {i + 1}位: {s.entry.name}
                  </span>
                ))}
                {standings.slice(advanceCount).map(s => (
                  <span key={s.entry.id} className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-400">{s.entry.name}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 決勝生成設定 */}
      {!finalsBlock && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div className="font-bold">決勝トーナメント生成</div>
          <div>
            <div className="text-sm text-gray-600 mb-2">各ブロックから何位まで進出？</div>
            <div className="flex gap-2">
              {[1,2,3].map(n => (
                <button key={n} onClick={() => setAdvanceCount(n)}
                  className={`flex-1 rounded-xl py-2 font-bold ${advanceCount === n ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {n}位まで
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            決勝進出者: {getTopEntries().map(e => e.name).join('、') || '（予選結果を入力してください）'}
          </div>
          <button onClick={generateFinals} disabled={generating || getTopEntries().length < 2}
            className="w-full bg-accent text-white rounded-xl py-4 font-bold text-lg disabled:opacity-40">
            {generating ? '生成中...' : '🏆 決勝トーナメントを生成'}
          </button>
        </div>
      )}

      {/* 決勝トーナメント表示 */}
      {finalsBlock && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold">決勝トーナメント</div>
            <button onClick={generateFinals} disabled={generating}
              className="text-xs bg-gray-100 text-gray-600 rounded-xl px-3 py-2 no-print disabled:opacity-40">
              再生成
            </button>
          </div>

          {rounds.map(round => {
            const roundMatches = finalsMatches.filter(m => m.round === round).sort((a, b) => a.match_order - b.match_order)
            const label = roundMatches[0]?.roundLabel ?? `第${round}ラウンド`
            return (
              <div key={round}>
                <div className="text-sm font-bold text-primary mb-2">── {label} ──</div>
                <div className="space-y-2">
                  {roundMatches.map((m, i) => {
                    const isFinal = round === Math.max(...rounds)
                    return (
                      <div key={m.id} className={`border-2 rounded-2xl p-4 ${
                        m.status === '終了' ? 'border-done/40 bg-green-50/50' :
                        (!m.entry1_id && !m.entry2_id) ? 'border-gray-100 bg-gray-50/50 opacity-50' :
                        isFinal ? 'border-accent bg-yellow-50/30' : 'border-gray-200 bg-white'
                      }`}>
                        {isFinal && m.status === '終了' && (
                          <div className="text-center text-lg font-bold text-accent mb-2">🏆 優勝</div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className={`flex-1 text-center font-bold ${m.status === '終了' && m.winner_id === m.entry1_id ? 'text-primary' : m.entry1 ? 'text-gray-800' : 'text-gray-300'}`}>
                            {m.entry1?.name ?? 'TBD'}
                            {m.entry1?.club && <div className="text-xs font-normal text-gray-400">{m.entry1.club}</div>}
                          </div>
                          <div className="text-center font-bold tabular-nums text-xl">
                            {m.status === '終了' ? (
                              <><span className={m.winner_id === m.entry1_id ? 'text-primary' : 'text-gray-400'}>{m.score1}</span>
                              <span className="text-gray-300 mx-1">-</span>
                              <span className={m.winner_id === m.entry2_id ? 'text-primary' : 'text-gray-400'}>{m.score2}</span></>
                            ) : <span className="text-gray-300 text-sm">vs</span>}
                          </div>
                          <div className={`flex-1 text-center font-bold ${m.status === '終了' && m.winner_id === m.entry2_id ? 'text-primary' : m.entry2 ? 'text-gray-800' : 'text-gray-300'}`}>
                            {m.entry2?.name ?? 'TBD'}
                            {m.entry2?.club && <div className="text-xs font-normal text-gray-400">{m.entry2.club}</div>}
                          </div>
                        </div>
                        {m.entry1 && m.entry2 && (m.entry1_id && m.entry2_id) && (
                          <button onClick={() => setSelectedMatch(m)}
                            className="mt-3 w-full bg-primary text-white rounded-xl py-2 text-sm font-bold no-print">
                            {m.status === '終了' ? '修正' : '結果入力'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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
