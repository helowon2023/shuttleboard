'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Block, Entry, Match, Tournament, Team, Tie, Rubber } from '@/lib/types'

// ────────────────────────────────────────
// ゲーム得点記録グリッド
// ────────────────────────────────────────
function TallySection({
  label, points, name1, name2,
}: { label: string; points: number; name1: string; name2: string }) {
  return (
    <div className="mb-1">
      <div className="bg-gray-200 text-xs font-bold px-2 py-0.5 border border-gray-400">{label}</div>
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '14%' }} />
          {Array.from({ length: points }, (_, i) => (
            <col key={i} style={{ width: `${86 / points}%` }} />
          ))}
          <col style={{ width: '5%' }} />
        </colgroup>
        <thead>
          <tr>
            <th className="border border-gray-400 text-xs px-1 py-0.5 bg-gray-100 text-left">氏名</th>
            {Array.from({ length: points }, (_, i) => (
              <th key={i} className="border border-gray-400 text-center bg-gray-50"
                style={{ fontSize: '8px', padding: '1px 0' }}>
                {i + 1}
              </th>
            ))}
            <th className="border border-gray-400 text-center bg-gray-100"
              style={{ fontSize: '8px', padding: '1px' }}>点</th>
          </tr>
        </thead>
        <tbody>
          {[name1, name2].map((name, ri) => (
            <tr key={ri}>
              <td className="border border-gray-400 text-xs px-1 py-0.5 font-medium truncate">{name || '　'}</td>
              {Array.from({ length: points }, (_, i) => (
                <td key={i} className="border border-gray-400" style={{ height: '1.5rem' }}></td>
              ))}
              <td className="border border-gray-400 bg-gray-50" style={{ height: '1.5rem' }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ────────────────────────────────────────
// 個人戦スコア用紙1枚
// ────────────────────────────────────────
function IndividualSheet({
  m, tournamentName, maxSets, isDoubles,
}: {
  m: Match & { matchNumber: number; categoryName: string; blockName: string; entry1?: Entry; entry2?: Entry }
  tournamentName: string
  maxSets: number
  isDoubles: boolean
}) {
  const name1 = m.entry1?.name ?? ''
  const name1b = isDoubles ? (m.entry1?.player2 ?? '') : ''
  const name2 = m.entry2?.name ?? ''
  const name2b = isDoubles ? (m.entry2?.player2 ?? '') : ''
  const club1 = m.entry1?.club ?? ''
  const club2 = m.entry2?.club ?? ''

  // 結果
  const g1s1 = m.score1, g1s2 = m.score2
  const g2s1 = m.score1_g2, g2s2 = m.score2_g2
  const g3s1 = m.score1_g3, g3s2 = m.score2_g3
  const winner = m.status === '終了' && m.winner_id
    ? (m.winner_id === m.entry1_id ? (name1 + (name1b ? ` / ${name1b}` : '')) : (name2 + (name2b ? ` / ${name2b}` : '')))
    : ''

  return (
    <div className="score-sheet bg-white" style={{
      width: '100%', boxSizing: 'border-box',
      padding: '6mm', border: '1px solid #666',
      pageBreakAfter: 'always', breakAfter: 'page',
    }}>
      {/* ヘッダー行 */}
      <div className="flex items-start justify-between border-b-2 border-gray-700 pb-1 mb-2">
        <div>
          <div className="font-bold text-sm leading-tight">{tournamentName}</div>
          <div className="text-xs text-gray-600">{m.categoryName}　{m.blockName}</div>
        </div>
        <div className="text-center px-2">
          <div className="text-xs text-gray-500">{isDoubles ? 'ダブルス' : 'シングルス'}</div>
          {maxSets >= 3 && <div className="text-xs text-gray-500">3セットマッチ</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold leading-tight">No. {m.matchNumber}</div>
          {m.court && <div className="text-xs text-gray-500">コート {m.court}</div>}
        </div>
      </div>

      {/* 選手名エリア */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch mb-2">
        <div className="border border-gray-400 rounded px-2 py-1 min-h-[2.2rem]">
          <div className="font-bold text-sm leading-tight">{name1 || '　'}</div>
          {isDoubles && <div className="font-bold text-sm leading-tight">{name1b || '　'}</div>}
          {club1 && <div className="text-xs text-gray-400">{club1}</div>}
        </div>
        <div className="flex items-center font-bold text-gray-400 text-base px-2">VS</div>
        <div className="border border-gray-400 rounded px-2 py-1 min-h-[2.2rem]">
          <div className="font-bold text-sm leading-tight">{name2 || '　'}</div>
          {isDoubles && <div className="font-bold text-sm leading-tight">{name2b || '　'}</div>}
          {club2 && <div className="text-xs text-gray-400">{club2}</div>}
        </div>
      </div>

      {/* ゲーム得点記録 */}
      <TallySection
        label={maxSets >= 3 ? '第1ゲーム（21点）' : '得点記録（21点）'}
        points={21}
        name1={name1 + (name1b ? ` / ${name1b}` : '')}
        name2={name2 + (name2b ? ` / ${name2b}` : '')}
      />
      {maxSets >= 3 && (
        <>
          <TallySection
            label="第2ゲーム（21点）"
            points={21}
            name1={name1 + (name1b ? ` / ${name1b}` : '')}
            name2={name2 + (name2b ? ` / ${name2b}` : '')}
          />
          <TallySection
            label="第3ゲーム　ファイナル11点（延長なし）"
            points={11}
            name1={name1 + (name1b ? ` / ${name1b}` : '')}
            name2={name2 + (name2b ? ` / ${name2b}` : '')}
          />
        </>
      )}

      {/* 結果・署名エリア */}
      <div className="mt-2 grid grid-cols-[1fr_1fr_2fr] gap-2 text-xs">
        {/* ゲームスコア */}
        <div className="border border-gray-400 rounded p-1">
          <div className="text-gray-500 text-xs mb-1">ゲームスコア</div>
          <table className="w-full border-collapse text-center" style={{ fontSize: '10px' }}>
            <thead>
              <tr>
                <th className="border border-gray-300 px-1">G</th>
                <th className="border border-gray-300 px-1">{name1 || '①'}</th>
                <th className="border border-gray-300 px-1">{name2 || '②'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-1 font-bold">1</td>
                <td className="border border-gray-300 px-1 font-bold">{g1s1 ?? ''}</td>
                <td className="border border-gray-300 px-1 font-bold">{g1s2 ?? ''}</td>
              </tr>
              {maxSets >= 3 && (
                <>
                  <tr>
                    <td className="border border-gray-300 px-1 font-bold">2</td>
                    <td className="border border-gray-300 px-1 font-bold">{g2s1 ?? ''}</td>
                    <td className="border border-gray-300 px-1 font-bold">{g2s2 ?? ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-1 font-bold">F</td>
                    <td className="border border-gray-300 px-1 font-bold">{g3s1 ?? ''}</td>
                    <td className="border border-gray-300 px-1 font-bold">{g3s2 ?? ''}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        {/* 勝者 */}
        <div className="border border-gray-400 rounded p-1">
          <div className="text-gray-500 text-xs mb-1">勝者</div>
          <div className="font-bold text-sm min-h-[1.5rem]">{winner}</div>
        </div>
        {/* 署名 */}
        <div className="border border-gray-400 rounded p-1 flex flex-col gap-2">
          <div>
            <div className="text-gray-500 text-xs">勝者署名</div>
            <div className="border-b border-gray-400 mt-3"></div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">主審署名</div>
            <div className="border-b border-gray-400 mt-3"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// 団体戦ラバー スコア用紙1枚
// ────────────────────────────────────────
function RubberSheet({
  r, tie, team1, team2, tournamentName, categoryName, blockName, maxSets, rubberIndex,
}: {
  r: Rubber; tie: Tie; team1?: Team; team2?: Team
  tournamentName: string; categoryName: string; blockName: string
  maxSets: number; rubberIndex: number
}) {
  const isDoubles = r.rubber_type === 'doubles'
  const p1a = r.team1_p1 ?? '', p1b = r.team1_p2 ?? ''
  const p2a = r.team2_p1 ?? '', p2b = r.team2_p2 ?? ''
  const name1 = isDoubles ? (p1a + (p1b ? ` / ${p1b}` : '')) : p1a
  const name2 = isDoubles ? (p2a + (p2b ? ` / ${p2b}` : '')) : p2a

  const g1s1 = r.score1, g1s2 = r.score2
  const g2s1 = r.score1_g2, g2s2 = r.score2_g2
  const g3s1 = r.score1_g3, g3s2 = r.score2_g3
  const winner = r.status === '終了' && r.winner_team_id
    ? (r.winner_team_id === tie.team1_id ? (team1?.name ?? '') : (team2?.name ?? ''))
    : ''

  return (
    <div className="score-sheet bg-white" style={{
      width: '100%', boxSizing: 'border-box',
      padding: '6mm', border: '1px solid #666',
      pageBreakAfter: 'always', breakAfter: 'page',
    }}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between border-b-2 border-gray-700 pb-1 mb-2">
        <div>
          <div className="font-bold text-sm leading-tight">{tournamentName}</div>
          <div className="text-xs text-gray-600">{categoryName}　{blockName}</div>
          <div className="text-xs text-gray-600">
            {team1?.name ?? '?'} vs {team2?.name ?? '?'}
          </div>
        </div>
        <div className="text-center px-2">
          <div className="text-xs text-gray-500">{isDoubles ? 'ダブルス' : 'シングルス'}</div>
          {maxSets >= 3 && <div className="text-xs text-gray-500">3セットマッチ</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold leading-tight">{r.label}</div>
          <div className="text-xs text-gray-500">第{rubberIndex + 1}種目</div>
          {r.court && <div className="text-xs text-gray-500">コート {r.court}</div>}
        </div>
      </div>

      {/* 選手名 */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch mb-2">
        <div className="border border-gray-400 rounded px-2 py-1 min-h-[2.2rem]">
          <div className="text-xs text-gray-400">{team1?.name}</div>
          <div className="font-bold text-sm leading-tight">{p1a || '　'}</div>
          {isDoubles && <div className="font-bold text-sm leading-tight">{p1b || '　'}</div>}
        </div>
        <div className="flex items-center font-bold text-gray-400 text-base px-2">VS</div>
        <div className="border border-gray-400 rounded px-2 py-1 min-h-[2.2rem]">
          <div className="text-xs text-gray-400">{team2?.name}</div>
          <div className="font-bold text-sm leading-tight">{p2a || '　'}</div>
          {isDoubles && <div className="font-bold text-sm leading-tight">{p2b || '　'}</div>}
        </div>
      </div>

      {/* ゲーム得点記録 */}
      <TallySection
        label={maxSets >= 3 ? '第1ゲーム（21点）' : '得点記録（21点）'}
        points={21} name1={name1} name2={name2}
      />
      {maxSets >= 3 && (
        <>
          <TallySection label="第2ゲーム（21点）" points={21} name1={name1} name2={name2} />
          <TallySection label="第3ゲーム　ファイナル11点（延長なし）" points={11} name1={name1} name2={name2} />
        </>
      )}

      {/* 結果・署名 */}
      <div className="mt-2 grid grid-cols-[1fr_1fr_2fr] gap-2 text-xs">
        <div className="border border-gray-400 rounded p-1">
          <div className="text-gray-500 text-xs mb-1">ゲームスコア</div>
          <table className="w-full border-collapse text-center" style={{ fontSize: '10px' }}>
            <thead>
              <tr>
                <th className="border border-gray-300 px-1">G</th>
                <th className="border border-gray-300 px-1">{team1?.name ?? '①'}</th>
                <th className="border border-gray-300 px-1">{team2?.name ?? '②'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-1 font-bold">1</td>
                <td className="border border-gray-300 px-1 font-bold">{g1s1 ?? ''}</td>
                <td className="border border-gray-300 px-1 font-bold">{g1s2 ?? ''}</td>
              </tr>
              {maxSets >= 3 && (
                <>
                  <tr>
                    <td className="border border-gray-300 px-1 font-bold">2</td>
                    <td className="border border-gray-300 px-1 font-bold">{g2s1 ?? ''}</td>
                    <td className="border border-gray-300 px-1 font-bold">{g2s2 ?? ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-1 font-bold">F</td>
                    <td className="border border-gray-300 px-1 font-bold">{g3s1 ?? ''}</td>
                    <td className="border border-gray-300 px-1 font-bold">{g3s2 ?? ''}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="border border-gray-400 rounded p-1">
          <div className="text-gray-500 text-xs mb-1">勝チーム</div>
          <div className="font-bold text-sm min-h-[1.5rem]">{winner}</div>
        </div>
        <div className="border border-gray-400 rounded p-1 flex flex-col gap-2">
          <div>
            <div className="text-gray-500 text-xs">勝者署名</div>
            <div className="border-b border-gray-400 mt-3"></div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">主審署名</div>
            <div className="border-b border-gray-400 mt-3"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// メインページ
// ────────────────────────────────────────
type SheetMatch = Match & {
  matchNumber: number; categoryName: string; blockName: string
  entry1?: Entry; entry2?: Entry; maxSets: number; isDoubles: boolean
}
type SheetRubber = Rubber & {
  tie: Tie; team1?: Team; team2?: Team
  tournamentName: string; categoryName: string; blockName: string
  maxSets: number; rubberIndex: number
}
type Sheet = { type: 'individual'; data: SheetMatch } | { type: 'rubber'; data: SheetRubber }

export default function ScoreSheetPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('all')
  const [selectedBlock, setSelectedBlock] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [showAll, setShowAll] = useState(false)  // false = 未試合のみ

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: t } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1)
    const tour = t?.[0]; if (!tour) { setLoading(false); return }
    setTournament(tour)

    const { data: cats } = await supabase.from('categories').select('*').eq('tournament_id', tour.id).order('sort_order')
    setCategories(cats ?? [])
    const catIds = (cats ?? []).map(c => c.id)
    if (catIds.length === 0) { setLoading(false); return }

    const { data: blks } = await supabase.from('blocks').select('*').in('category_id', catIds).order('name')
    setBlocks(blks ?? [])
    const blockIds = (blks ?? []).map(b => b.id)
    if (blockIds.length === 0) { setLoading(false); return }

    const [
      { data: allMatches }, { data: allEntries },
      { data: allTeams }, { data: allTies }, { data: allRubbers },
    ] = await Promise.all([
      supabase.from('matches').select('*').in('block_id', blockIds).order('match_order'),
      supabase.from('entries').select('*').in('block_id', blockIds),
      supabase.from('teams').select('*').in('block_id', blockIds),
      supabase.from('ties').select('*').in('block_id', blockIds).order('match_order'),
      supabase.from('rubbers').select('*'),
    ])

    const catMap = new Map((cats ?? []).map(c => [c.id, c]))
    const blockMap = new Map((blks ?? []).map(b => [b.id, b]))
    const entryMap = new Map((allEntries ?? []).map(e => [e.id, e]))
    const teamMap = new Map((allTeams ?? []).map(t => [t.id, t]))

    const result: Sheet[] = []
    let matchNum = 0

    // ブロックをカテゴリ順・ブロック名順でソート
    const sortedBlocks = [...(blks ?? [])].sort((a, b) => {
      const cA = catMap.get(a.category_id)?.sort_order ?? 0
      const cB = catMap.get(b.category_id)?.sort_order ?? 0
      return cA !== cB ? cA - cB : a.name.localeCompare(b.name)
    })

    for (const blk of sortedBlocks) {
      const cat = catMap.get(blk.category_id)
      if (!cat) continue
      const maxSets = cat.max_sets ?? 1
      const isDoubles = cat.format === 'doubles'

      if (cat.type === 'individual') {
        const blockMatches = (allMatches ?? [])
          .filter(m => m.block_id === blk.id)
          .sort((a, b) => a.match_order - b.match_order)
        for (const m of blockMatches) {
          matchNum++
          result.push({
            type: 'individual',
            data: {
              ...m,
              matchNumber: matchNum,
              categoryName: cat.name,
              blockName: blk.name,
              entry1: m.entry1_id ? entryMap.get(m.entry1_id) : undefined,
              entry2: m.entry2_id ? entryMap.get(m.entry2_id) : undefined,
              maxSets,
              isDoubles,
            },
          })
        }
      } else {
        // 団体戦: tie→rubbers
        const blockTies = (allTies ?? []).filter(tie => tie.block_id === blk.id)
        for (const tie of blockTies) {
          const tieRubbers = (allRubbers ?? [])
            .filter(r => r.tie_id === tie.id)
            .sort((a, b) => a.rubber_no - b.rubber_no)
          for (let ri = 0; ri < tieRubbers.length; ri++) {
            const r = tieRubbers[ri]
            result.push({
              type: 'rubber',
              data: {
                ...r,
                tie,
                team1: tie.team1_id ? teamMap.get(tie.team1_id) : undefined,
                team2: tie.team2_id ? teamMap.get(tie.team2_id) : undefined,
                tournamentName: tour.name,
                categoryName: cat.name,
                blockName: blk.name,
                maxSets,
                rubberIndex: ri,
              },
            })
          }
        }
      }
    }

    setSheets(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // フィルター
  const filtered = sheets.filter(s => {
    const catName = s.type === 'individual' ? s.data.categoryName : s.data.categoryName
    const blockName = s.type === 'individual' ? s.data.blockName : s.data.blockName
    if (selectedCat !== 'all') {
      const cat = categories.find(c => c.id === selectedCat)
      if (cat?.name !== catName) return false
    }
    if (selectedBlock !== 'all') {
      const blk = blocks.find(b => b.id === selectedBlock)
      if (blk?.name !== blockName) return false
    }
    if (!showAll) {
      // 未試合・進行中のみ
      const status = s.type === 'individual' ? s.data.status : s.data.status
      if (status === '終了') return false
    }
    return true
  })

  const filteredBlocks = selectedCat === 'all'
    ? blocks
    : blocks.filter(b => b.category_id === selectedCat)

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>

  return (
    <div className="space-y-4 pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          @page { size: A4 landscape; margin: 8mm; }
          .sheets-container { display: block !important; }
          .score-sheet {
            page-break-after: always !important;
            break-after: page !important;
            border: 1px solid #555 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .score-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* コントロール */}
      <div className="no-print space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">📝 スコア用紙</h1>
          <button onClick={() => window.print()} className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-bold">
            🖨️ 印刷（横A4）
          </button>
        </div>

        {/* 表示切替 */}
        <div className="flex gap-2">
          <button onClick={() => setShowAll(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${!showAll ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
            未試合のみ
          </button>
          <button onClick={() => setShowAll(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${showAll ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
            全試合
          </button>
        </div>

        {/* 種目フィルター */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => { setSelectedCat('all'); setSelectedBlock('all') }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedCat === 'all' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
            全種目
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { setSelectedCat(cat.id); setSelectedBlock('all') }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedCat === cat.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* ブロックフィルター */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedBlock('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedBlock === 'all' ? 'bg-accent text-white border-accent' : 'bg-white border-gray-200 text-gray-600'}`}>
            全ブロック
          </button>
          {filteredBlocks.map(b => (
            <button key={b.id} onClick={() => setSelectedBlock(b.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedBlock === b.id ? 'bg-accent text-white border-accent' : 'bg-white border-gray-200 text-gray-600'}`}>
              {b.name}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500">
          {filtered.length}枚（横A4 1ページ×1枚）
        </div>
      </div>

      {/* スコア用紙 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 no-print">
          <div className="text-3xl mb-2">📝</div>
          <div>試合データがありません</div>
        </div>
      ) : (
        <div className="sheets-container space-y-4">
          {filtered.map((s, idx) => {
            if (s.type === 'individual') {
              return (
                <IndividualSheet
                  key={`ind-${s.data.id}`}
                  m={s.data}
                  tournamentName={tournament?.name ?? ''}
                  maxSets={s.data.maxSets}
                  isDoubles={s.data.isDoubles}
                />
              )
            } else {
              const d = s.data
              return (
                <RubberSheet
                  key={`rub-${d.id}`}
                  r={d}
                  tie={d.tie}
                  team1={d.team1}
                  team2={d.team2}
                  tournamentName={d.tournamentName}
                  categoryName={d.categoryName}
                  blockName={d.blockName}
                  maxSets={d.maxSets}
                  rubberIndex={d.rubberIndex}
                />
              )
            }
          })}
        </div>
      )}
    </div>
  )
}
