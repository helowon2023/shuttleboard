'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Block, Entry, Match, Tournament, Team, Tie, Rubber } from '@/lib/types'

// ──────────────────────────────────────────────────────
// タリーグリッド（1行 = 1選手分の得点マス）
// ──────────────────────────────────────────────────────
function TallyRow({ name, points, shaded }: { name: string; points: number; shaded?: boolean }) {
  const cellStyle: React.CSSProperties = {
    border: '1px dashed #888',
    width: `${Math.floor(560 / points)}px`,
    height: '18px',
    minWidth: '0',
  }
  return (
    <tr style={{ background: shaded ? '#e8e8e8' : 'white' }}>
      <td style={{
        border: '1px solid #666', padding: '0 3px',
        fontSize: '8px', fontWeight: 'bold', whiteSpace: 'nowrap',
        maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{name || '　'}</td>
      <td style={{ border: '1px solid #666', width: '14px', textAlign: 'center', fontSize: '7px', fontWeight: 'bold', color: '#1a5' }}>S</td>
      <td style={{ border: '1px solid #666', width: '14px', textAlign: 'center', fontSize: '7px', fontWeight: 'bold', color: '#e44' }}>R</td>
      {Array.from({ length: points }, (_, i) => (
        <td key={i} style={cellStyle}></td>
      ))}
      <td style={{ border: '1px solid #666', width: '18px', background: '#f5f5f5' }}></td>
    </tr>
  )
}

// ──────────────────────────────────────────────────────
// 1ゲーム分のセクション
// ──────────────────────────────────────────────────────
function GameSection({ label, points, players }: {
  label: string
  points: number
  players: { name: string; shaded?: boolean }[]
}) {
  return (
    <div style={{ marginTop: '5px' }}>
      <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#333', marginBottom: '1px', paddingLeft: '2px' }}>
        S · R　{label}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '70px' }} />
          <col style={{ width: '14px' }} />
          <col style={{ width: '14px' }} />
          {Array.from({ length: points }, (_, i) => (
            <col key={i} style={{ width: `${Math.floor(560 / points)}px` }} />
          ))}
          <col style={{ width: '18px' }} />
        </colgroup>
        <tbody>
          {players.map((p, i) => (
            <TallyRow key={i} name={p.name} points={points} shaded={p.shaded} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────
// シングルス用スコア用紙
// ──────────────────────────────────────────────────────
function SinglesSheet({ m, tourName, maxSets, matchNum }: {
  m: Match & { entry1?: Entry; entry2?: Entry; categoryName: string; blockName: string }
  tourName: string
  maxSets: number
  matchNum: number
}) {
  const p1 = m.entry1?.name ?? ''
  const p2 = m.entry2?.name ?? ''
  const c1 = m.entry1?.club ?? ''
  const c2 = m.entry2?.club ?? ''

  const players21 = [{ name: p1 }, { name: p2, shaded: true }]
  const players11 = [{ name: p1 }, { name: p2, shaded: true }]

  return (
    <div className="score-sheet" style={{
      background: 'white', border: '1px solid #555',
      padding: '8px 10px', boxSizing: 'border-box', width: '100%',
      pageBreakAfter: 'always', breakAfter: 'page',
      fontFamily: 'sans-serif',
    }}>
      {/* タイトル */}
      <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', borderBottom: '2px solid #333', paddingBottom: '3px', marginBottom: '5px' }}>
        スコアーシート（得点用紙）
      </div>

      {/* ヘッダー情報 */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '4px' }}>
        {/* 左: 試合情報 */}
        <div style={{ display: 'grid', gridTemplateRows: 'auto auto auto', gap: '2px' }}>
          <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
            <span style={{ fontWeight: 'bold' }}>種目：</span>{m.categoryName}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
              <span style={{ fontWeight: 'bold' }}>試合番号</span><br />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{matchNum}</span>
            </div>
            <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
              <span style={{ fontWeight: 'bold' }}>コート番号</span><br />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{m.court ?? ''}</span>
            </div>
          </div>
          <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '8px', color: '#666' }}>
            {tourName}　{m.blockName}
          </div>
        </div>

        {/* 右: 選手名エリア */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto 1fr auto', gap: '4px', alignItems: 'center' }}>
          {/* 選手1 */}
          <div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '22px', fontSize: '11px', fontWeight: 'bold' }}>{p1}</div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '16px', fontSize: '9px', color: '#555', marginTop: '2px' }}>{c1}</div>
          </div>
          {/* R/L 左 */}
          <div style={{ border: '1px solid #555', padding: '2px 4px', fontSize: '10px', fontWeight: 'bold', color: '#1a5', textAlign: 'center', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            <div>R</div><div>·</div><div>L</div>
          </div>
          {/* vs */}
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#999', padding: '0 6px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
            <div>—</div><div>—</div>
          </div>
          {/* 選手2 */}
          <div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '22px', fontSize: '11px', fontWeight: 'bold' }}>{p2}</div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '16px', fontSize: '9px', color: '#555', marginTop: '2px' }}>{c2}</div>
          </div>
          {/* R/L 右 */}
          <div style={{ border: '1px solid #555', padding: '2px 4px', fontSize: '10px', fontWeight: 'bold', color: '#1a5', textAlign: 'center', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            <div>R</div><div>·</div><div>L</div>
          </div>
        </div>
      </div>

      {/* ゲームセクション */}
      <GameSection label={maxSets >= 3 ? '第1ゲーム（21点）' : '得点記録（21点）'} points={21} players={players21} />
      {maxSets >= 3 && <>
        <GameSection label="第2ゲーム（21点）" points={21} players={players21} />
        <GameSection label="第3ゲーム　ファイナル11点（延長なし）" points={11} players={players11} />
      </>}

      {/* 署名 */}
      <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold' }}>勝者署名</div>
          <div style={{ borderBottom: '1px solid #333', height: '20px', marginTop: '4px' }}></div>
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold' }}>主審署名</div>
          <div style={{ borderBottom: '1px solid #333', height: '20px', marginTop: '4px' }}></div>
        </div>
        <div style={{ fontSize: '8px', color: '#888', whiteSpace: 'nowrap' }}>新星☆柏原</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────
// ダブルス用スコア用紙
// ──────────────────────────────────────────────────────
function DoublesSheet({ m, tourName, maxSets, matchNum }: {
  m: Match & { entry1?: Entry; entry2?: Entry; categoryName: string; blockName: string }
  tourName: string
  maxSets: number
  matchNum: number
}) {
  const p1a = m.entry1?.name ?? ''
  const p1b = m.entry1?.player2 ?? ''
  const p2a = m.entry2?.name ?? ''
  const p2b = m.entry2?.player2 ?? ''
  const c1 = m.entry1?.club ?? ''
  const c2 = m.entry2?.club ?? ''

  // ダブルス: 1ペア2名 × 左右 = 4行
  const players21 = [
    { name: p1a },
    { name: p1b },
    { name: p2a, shaded: true },
    { name: p2b, shaded: true },
  ]
  const players11 = [
    { name: p1a },
    { name: p1b },
    { name: p2a, shaded: true },
    { name: p2b, shaded: true },
  ]

  return (
    <div className="score-sheet" style={{
      background: 'white', border: '1px solid #555',
      padding: '8px 10px', boxSizing: 'border-box', width: '100%',
      pageBreakAfter: 'always', breakAfter: 'page',
      fontFamily: 'sans-serif',
    }}>
      {/* タイトル */}
      <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', borderBottom: '2px solid #333', paddingBottom: '3px', marginBottom: '5px' }}>
        スコアーシート（得点用紙）
      </div>

      {/* ヘッダー */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '4px', marginBottom: '4px', alignItems: 'start' }}>
        {/* 左: 試合情報 */}
        <div style={{ display: 'grid', gap: '2px' }}>
          <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
            <span style={{ fontWeight: 'bold' }}>種目：</span>{m.categoryName}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
              <span style={{ fontWeight: 'bold' }}>試合番号</span><br />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{matchNum}</span>
            </div>
            <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
              <span style={{ fontWeight: 'bold' }}>コート番号</span><br />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{m.court ?? ''}</span>
            </div>
          </div>
          <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '8px', color: '#666' }}>
            {tourName}　{m.blockName}
          </div>
        </div>

        {/* 中: 選手名（2名×2） */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto 1fr auto', gap: '4px', alignItems: 'start' }}>
          {/* 左ペア */}
          <div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold' }}>{p1a}</div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>{p1b}</div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '14px', fontSize: '8px', color: '#666', marginTop: '2px' }}>{c1}</div>
          </div>
          {/* R/L 左 */}
          <div style={{ border: '1px solid #555', padding: '2px 4px', fontSize: '10px', fontWeight: 'bold', color: '#1a5', textAlign: 'center', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            <div>R</div><div>·</div><div>L</div>
          </div>
          {/* vs */}
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#999', padding: '0 6px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' }}>
            <div>—</div><div>—</div><div>—</div>
          </div>
          {/* 右ペア */}
          <div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold' }}>{p2a}</div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>{p2b}</div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '14px', fontSize: '8px', color: '#666', marginTop: '2px' }}>{c2}</div>
          </div>
          {/* R/L 右 */}
          <div style={{ border: '1px solid #555', padding: '2px 4px', fontSize: '10px', fontWeight: 'bold', color: '#1a5', textAlign: 'center', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            <div>R</div><div>·</div><div>L</div>
          </div>
        </div>

        {/* 右: ゲーム数ラベル */}
        <div style={{ fontSize: '9px', fontWeight: 'bold', paddingLeft: '6px', whiteSpace: 'nowrap' }}>
          <div style={{ color: '#333' }}>21点2ゲーム</div>
          <div style={{ color: '#333', marginTop: '4px' }}>ファイナル11点</div>
          <div style={{ color: '#333' }}>（延長なし）</div>
        </div>
      </div>

      {/* ゲームセクション */}
      <GameSection label={maxSets >= 3 ? '第1ゲーム（21点）' : '得点記録（21点）'} points={21} players={players21} />
      {maxSets >= 3 && <>
        <GameSection label="第2ゲーム（21点）" points={21} players={players21} />
        <GameSection label="第3ゲーム　ファイナル11点（延長なし）" points={11} players={players11} />
      </>}

      {/* 署名 */}
      <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold' }}>勝者署名</div>
          <div style={{ borderBottom: '1px solid #333', height: '20px', marginTop: '4px' }}></div>
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold' }}>主審署名</div>
          <div style={{ borderBottom: '1px solid #333', height: '20px', marginTop: '4px' }}></div>
        </div>
        <div style={{ fontSize: '8px', color: '#888', whiteSpace: 'nowrap' }}>新星☆柏原</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────
// 団体戦ラバー用スコア用紙
// ──────────────────────────────────────────────────────
function RubberSheet({ r, tie, team1, team2, tourName, catName, blockName, maxSets, rubberIndex }: {
  r: Rubber; tie: Tie; team1?: Team; team2?: Team
  tourName: string; catName: string; blockName: string
  maxSets: number; rubberIndex: number
}) {
  const isDoubles = r.rubber_type === 'doubles'
  const p1a = r.team1_p1 ?? '', p1b = r.team1_p2 ?? ''
  const p2a = r.team2_p1 ?? '', p2b = r.team2_p2 ?? ''

  const players = isDoubles
    ? [{ name: p1a }, { name: p1b }, { name: p2a, shaded: true }, { name: p2b, shaded: true }]
    : [{ name: p1a }, { name: p2a, shaded: true }]

  return (
    <div className="score-sheet" style={{
      background: 'white', border: '1px solid #555',
      padding: '8px 10px', boxSizing: 'border-box', width: '100%',
      pageBreakAfter: 'always', breakAfter: 'page',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', borderBottom: '2px solid #333', paddingBottom: '3px', marginBottom: '5px' }}>
        スコアーシート（得点用紙）
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '4px' }}>
        <div style={{ display: 'grid', gap: '2px' }}>
          <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
            <span style={{ fontWeight: 'bold' }}>種目：</span>{catName}
          </div>
          <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '9px' }}>
            <span style={{ fontWeight: 'bold' }}>{r.label}　</span>{isDoubles ? 'ダブルス' : 'シングルス'}
          </div>
          <div style={{ border: '1px solid #666', padding: '2px 4px', fontSize: '8px', color: '#666' }}>
            {tourName}　{blockName}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto 1fr auto', gap: '4px', alignItems: 'start' }}>
          <div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold' }}>{p1a}</div>
            {isDoubles && <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>{p1b}</div>}
            <div style={{ border: '1px solid #666', padding: '2px 6px', fontSize: '8px', color: '#666', marginTop: '2px' }}>{team1?.name ?? ''}</div>
          </div>
          <div style={{ border: '1px solid #555', padding: '2px 4px', fontSize: '10px', fontWeight: 'bold', color: '#1a5', textAlign: 'center', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            <div>R</div><div>·</div><div>L</div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#999', padding: '0 6px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' }}>
            <div>—</div><div>—</div>
          </div>
          <div>
            <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold' }}>{p2a}</div>
            {isDoubles && <div style={{ border: '1px solid #666', padding: '2px 6px', minHeight: '18px', fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>{p2b}</div>}
            <div style={{ border: '1px solid #666', padding: '2px 6px', fontSize: '8px', color: '#666', marginTop: '2px' }}>{team2?.name ?? ''}</div>
          </div>
          <div style={{ border: '1px solid #555', padding: '2px 4px', fontSize: '10px', fontWeight: 'bold', color: '#1a5', textAlign: 'center', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            <div>R</div><div>·</div><div>L</div>
          </div>
        </div>
      </div>
      <GameSection label={maxSets >= 3 ? '第1ゲーム（21点）' : '得点記録（21点）'} points={21} players={players} />
      {maxSets >= 3 && <>
        <GameSection label="第2ゲーム（21点）" points={21} players={players} />
        <GameSection label="第3ゲーム　ファイナル11点（延長なし）" points={11} players={players} />
      </>}
      <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold' }}>勝者署名</div>
          <div style={{ borderBottom: '1px solid #333', height: '20px', marginTop: '4px' }}></div>
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 'bold' }}>主審署名</div>
          <div style={{ borderBottom: '1px solid #333', height: '20px', marginTop: '4px' }}></div>
        </div>
        <div style={{ fontSize: '8px', color: '#888' }}>新星☆柏原</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────
// メインページ
// ──────────────────────────────────────────────────────
type SheetMatch = Match & {
  matchNumber: number; categoryName: string; blockName: string
  entry1?: Entry; entry2?: Entry; maxSets: number; isDoubles: boolean
}
type SheetRubber = Rubber & {
  tie: Tie; team1?: Team; team2?: Team
  tourName: string; catName: string; blockName: string
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
  const [showAll, setShowAll] = useState(false)

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
                tourName: tour.name,
                catName: cat.name,
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

  const filtered = sheets.filter(s => {
    const catName = s.type === 'individual' ? s.data.categoryName : s.data.catName
    const blockName = s.data.blockName
    if (selectedCat !== 'all') {
      const cat = categories.find(c => c.id === selectedCat)
      if (cat?.name !== catName) return false
    }
    if (selectedBlock !== 'all') {
      const blk = blocks.find(b => b.id === selectedBlock)
      if (blk?.name !== blockName) return false
    }
    if (!showAll) {
      const status = s.data.status
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
          {filtered.length}枚（横A4・1ページ1枚）
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 no-print">
          <div className="text-3xl mb-2">📝</div>
          <div>試合データがありません</div>
        </div>
      ) : (
        <div className="sheets-container space-y-4">
          {filtered.map((s) => {
            if (s.type === 'individual') {
              const d = s.data
              return d.isDoubles
                ? <DoublesSheet key={d.id} m={d} tourName={tournament?.name ?? ''} maxSets={d.maxSets} matchNum={d.matchNumber} />
                : <SinglesSheet key={d.id} m={d} tourName={tournament?.name ?? ''} maxSets={d.maxSets} matchNum={d.matchNumber} />
            } else {
              const d = s.data
              return (
                <RubberSheet
                  key={d.id}
                  r={d} tie={d.tie} team1={d.team1} team2={d.team2}
                  tourName={d.tourName} catName={d.catName} blockName={d.blockName}
                  maxSets={d.maxSets} rubberIndex={d.rubberIndex}
                />
              )
            }
          })}
        </div>
      )}
    </div>
  )
}
