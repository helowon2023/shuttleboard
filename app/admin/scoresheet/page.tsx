'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Block, Entry, Match, Tournament } from '@/lib/types'

interface SheetMatch extends Match {
  matchNumber: number
  categoryName: string
  blockName: string
  entry1?: Entry
  entry2?: Entry
}

// ────────────────────────────────────────
// スコア用紙1枚コンポーネント
// ────────────────────────────────────────
function ScoreSheet({ m, tournamentName }: { m: SheetMatch; tournamentName: string }) {
  return (
    <div className="score-sheet border-2 border-gray-700 rounded-sm p-3 text-xs bg-white" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between border-b border-gray-400 pb-1 mb-2">
        <div>
          <div className="font-bold text-sm">{tournamentName}</div>
          <div className="text-gray-500">{m.categoryName}　{m.blockName}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-700">No. {m.matchNumber}</div>
          {m.court && <div className="text-gray-500">コート {m.court}</div>}
        </div>
      </div>

      {/* 選手名 */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-3">
        <div className="border border-gray-400 rounded p-2 min-h-[2.5rem]">
          <div className="font-bold text-sm">{m.entry1?.name ?? '　'}</div>
          {m.entry1?.player2 && <div className="font-bold text-sm">{m.entry1.player2}</div>}
          <div className="text-gray-400 text-xs mt-0.5">{m.entry1?.club ?? '　'}</div>
        </div>
        <div className="font-bold text-gray-400 text-base px-1">VS</div>
        <div className="border border-gray-400 rounded p-2 min-h-[2.5rem]">
          <div className="font-bold text-sm">{m.entry2?.name ?? '　'}</div>
          {m.entry2?.player2 && <div className="font-bold text-sm">{m.entry2.player2}</div>}
          <div className="text-gray-400 text-xs mt-0.5">{m.entry2?.club ?? '　'}</div>
        </div>
      </div>

      {/* スコア記録欄 */}
      <div className="border border-gray-400 rounded overflow-hidden mb-2">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-1 py-1 w-6">点</th>
              {Array.from({ length: 21 }, (_, i) => (
                <th key={i} className="border border-gray-300 text-gray-500 font-normal" style={{ width: '4%', padding: '1px' }}>
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-1 py-1 font-bold bg-gray-50">①</td>
              {Array.from({ length: 21 }, (_, i) => (
                <td key={i} className="border border-gray-300" style={{ height: '1.4rem' }}></td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 px-1 py-1 font-bold bg-gray-50">②</td>
              {Array.from({ length: 21 }, (_, i) => (
                <td key={i} className="border border-gray-300" style={{ height: '1.4rem' }}></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 結果欄 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="border border-gray-400 rounded p-1">
          <div className="text-gray-400 mb-1">スコア</div>
          <div className="flex items-center justify-center gap-1">
            <span className="border-b border-gray-400 w-8 text-center text-base font-bold">{m.status === '終了' ? m.score1 : ''}</span>
            <span className="text-gray-400">—</span>
            <span className="border-b border-gray-400 w-8 text-center text-base font-bold">{m.status === '終了' ? m.score2 : ''}</span>
          </div>
        </div>
        <div className="border border-gray-400 rounded p-1 col-span-2">
          <div className="text-gray-400 mb-1">勝者</div>
          <div className="font-bold text-sm min-h-[1.2rem]">
            {m.status === '終了' && m.winner_id
              ? (m.winner_id === m.entry1_id ? m.entry1?.name : m.entry2?.name) ?? ''
              : ''}
          </div>
        </div>
      </div>

      {/* 審判署名欄 */}
      <div className="mt-2 flex gap-2">
        <div className="flex-1 border-b border-gray-400 text-gray-400 pb-0.5">審判：</div>
        <div className="flex-1 border-b border-gray-400 text-gray-400 pb-0.5">記録：</div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────
// メインページ
// ────────────────────────────────────────
export default function ScoreSheetPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<SheetMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('all')
  const [selectedBlock, setSelectedBlock] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])

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

    const [{ data: allMatches }, { data: allEntries }] = await Promise.all([
      supabase.from('matches').select('*').in('block_id', blockIds).order('match_order'),
      supabase.from('entries').select('*').in('block_id', blockIds),
    ])

    const catMap = new Map((cats ?? []).map(c => [c.id, c]))
    const blockMap = new Map((blks ?? []).map(b => [b.id, b]))
    const entryMap = new Map((allEntries ?? []).map(e => [e.id, e]))

    // ブロックをカテゴリ順→ブロック名順でソート
    const sortedBlocks = [...(blks ?? [])].sort((a, b) => {
      const catA = catMap.get(a.category_id)?.sort_order ?? 0
      const catB = catMap.get(b.category_id)?.sort_order ?? 0
      return catA !== catB ? catA - catB : a.name.localeCompare(b.name)
    })

    // ジッパー合流（まんべんなく進む順）
    const matchesByBlock = new Map<string, Match[]>(sortedBlocks.map(b => [b.id, []]))
    for (const m of allMatches ?? []) { matchesByBlock.get(m.block_id)?.push(m) }
    Array.from(matchesByBlock.values()).forEach(ms => { ms.sort((a, b) => a.match_order - b.match_order) })
    const maxLen = Math.max(...Array.from(matchesByBlock.values()).map(ms => ms.length), 0)
    const sorted: Match[] = []
    for (let i = 0; i < maxLen; i++) {
      for (const blk of sortedBlocks) {
        const ms = matchesByBlock.get(blk.id)
        if (ms && ms[i]) sorted.push(ms[i])
      }
    }

    const withNumbers: SheetMatch[] = sorted.map((m, idx) => {
      const block = blockMap.get(m.block_id)
      const cat = block ? catMap.get(block.category_id) : undefined
      return {
        ...m,
        matchNumber: idx + 1,
        categoryName: cat?.name ?? '',
        blockName: block?.name ?? '',
        entry1: m.entry1_id ? entryMap.get(m.entry1_id) : undefined,
        entry2: m.entry2_id ? entryMap.get(m.entry2_id) : undefined,
      }
    })

    setMatches(withNumbers)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredBlocks = selectedCat === 'all'
    ? blocks
    : blocks.filter(b => {
        const cat = categories.find(c => c.id === b.category_id)
        return cat?.id === selectedCat
      })

  const filtered = matches.filter(m => {
    if (selectedCat !== 'all' && m.categoryName !== categories.find(c => c.id === selectedCat)?.name) return false
    if (selectedBlock !== 'all' && m.blockName !== blocks.find(b => b.id === selectedBlock)?.name) return false
    return true
  })

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>

  return (
    <div className="space-y-4 pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .sheets-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6mm !important;
            padding: 8mm !important;
          }
          .score-sheet { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      {/* コントロール */}
      <div className="no-print space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">📝 スコア用紙</h1>
          <button onClick={() => window.print()} className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-bold">
            🖨️ 印刷
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
          {filtered.length}枚（A4で {Math.ceil(filtered.length / 2)} ページ）
        </div>
      </div>

      {/* スコア用紙グリッド */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 no-print">
          <div className="text-3xl mb-2">📝</div>
          <div>試合データがありません</div>
        </div>
      ) : (
        <div className="sheets-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(m => (
            <ScoreSheet key={m.id} m={m} tournamentName={tournament?.name ?? ''} />
          ))}
        </div>
      )}
    </div>
  )
}
