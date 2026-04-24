'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Block, Entry, Match, Tournament, Team, Tie, Rubber } from '@/lib/types'

// ──────────── 個人戦用 ────────────
interface IndividualProgram {
  kind: 'individual'
  category: Category
  block: Block
  entries: Entry[]
  matches: Match[]
}

// ──────────── 団体戦用 ────────────
interface TeamProgram {
  kind: 'team'
  category: Category
  block: Block
  teams: Team[]
  ties: Tie[]
  rubbers: Rubber[]
}

type BlockProgram = IndividualProgram | TeamProgram

// ──────────── 個人戦順位計算 ────────────
function getStandings(entries: Entry[], matches: Match[]) {
  const stats = new Map(entries.map(e => [e.id, { entry: e, wins: 0, losses: 0, pts_for: 0, pts_against: 0 }]))
  for (const m of matches) {
    if (m.status !== '終了' || m.winner_id == null) continue
    const e1 = stats.get(m.entry1_id ?? ''); const e2 = stats.get(m.entry2_id ?? '')
    if (e1 && e2) {
      if (m.winner_id === m.entry1_id) { e1.wins++; e2.losses++ } else { e2.wins++; e1.losses++ }
      e1.pts_for += m.score1 ?? 0; e1.pts_against += m.score2 ?? 0
      e2.pts_for += m.score2 ?? 0; e2.pts_against += m.score1 ?? 0
    }
  }
  return Array.from(stats.values()).sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : (b.pts_for - b.pts_against) - (a.pts_for - a.pts_against)
  )
}

// ──────────── 団体戦順位計算 ────────────
function getTeamStandings(teams: Team[], ties: Tie[]) {
  const stats = new Map(teams.map(t => [t.id, { team: t, wins: 0, losses: 0 }]))
  for (const tie of ties) {
    if (!tie.winner_team_id) continue
    const w = stats.get(tie.winner_team_id)
    const loserId = tie.team1_id === tie.winner_team_id ? tie.team2_id : tie.team1_id
    const l = loserId ? stats.get(loserId) : undefined
    if (w) w.wins++
    if (l) l.losses++
  }
  return Array.from(stats.values()).sort((a, b) => b.wins - a.wins)
}

// ──────────── 個人戦リーグ表 ────────────
function RoundRobinTable({ entries, matches }: { entries: Entry[]; matches: Match[] }) {
  const idxMap = new Map(entries.map((e, i) => [e.id, i]))
  const n = entries.length
  const grid: (Match | null)[][] = Array.from({ length: n }, () => Array(n).fill(null))
  for (const m of matches) {
    const i = idxMap.get(m.entry1_id ?? ''); const j = idxMap.get(m.entry2_id ?? '')
    if (i != null && j != null) { grid[i][j] = m; grid[j][i] = m }
  }
  const standings = getStandings(entries, matches)
  const rankMap = new Map(standings.map((s, i) => [s.entry.id, i + 1]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-left w-5">№</th>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-left">氏名（所属）</th>
            {entries.map((_, i) => <th key={i} className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">{i + 1}</th>)}
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">勝</th>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">負</th>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">順位</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const s = standings.find(s => s.entry.id === entry.id)
            return (
              <tr key={entry.id}>
                <td className="border border-gray-400 px-1 py-1 text-center text-gray-400">{i + 1}</td>
                <td className="border border-gray-400 px-1 py-2">
                  <div className="font-medium">{entry.name}{entry.player2 ? ` / ${entry.player2}` : ''}</div>
                  {entry.club && <div className="text-gray-400 text-xs">{entry.club}</div>}
                </td>
                {entries.map((_, j) => {
                  if (i === j) return <td key={j} className="border border-gray-400 bg-gray-300 text-center">╲</td>
                  const m = grid[i][j]
                  if (!m || m.status !== '終了') return <td key={j} className="border border-gray-400 px-1 py-1 text-center text-gray-200"></td>
                  const myScore = m.entry1_id === entry.id ? m.score1 : m.score2
                  const oppScore = m.entry1_id === entry.id ? m.score2 : m.score1
                  const won = m.winner_id === entry.id
                  return (
                    <td key={j} className={`border border-gray-400 px-0.5 py-1 text-center font-bold text-xs ${won ? 'bg-pink-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                      <div>{won ? '○' : '×'}</div>
                      <div className="text-xs">{myScore}-{oppScore}</div>
                    </td>
                  )
                })}
                <td className="border border-gray-400 px-1 py-1 text-center font-bold">{s?.wins ?? 0}</td>
                <td className="border border-gray-400 px-1 py-1 text-center">{s?.losses ?? 0}</td>
                <td className="border border-gray-400 px-1 py-1 text-center font-bold text-primary">{rankMap.get(entry.id) ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────── 団体戦リーグ表 ────────────
function TeamRoundRobinTable({ teams, ties }: { teams: Team[]; ties: Tie[] }) {
  const idxMap = new Map(teams.map((t, i) => [t.id, i]))
  const n = teams.length
  const grid: (Tie | null)[][] = Array.from({ length: n }, () => Array(n).fill(null))
  for (const tie of ties) {
    const i = idxMap.get(tie.team1_id ?? ''); const j = idxMap.get(tie.team2_id ?? '')
    if (i != null && j != null) { grid[i][j] = tie; grid[j][i] = tie }
  }
  const standings = getTeamStandings(teams, ties)
  const rankMap = new Map(standings.map((s, i) => [s.team.id, i + 1]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-left w-5">№</th>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-left">チーム（所属）</th>
            {teams.map((_, i) => <th key={i} className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">{i + 1}</th>)}
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">勝</th>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">負</th>
            <th className="border border-gray-400 px-1 py-1 bg-gray-100 text-center w-8">順位</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, i) => {
            const s = standings.find(s => s.team.id === team.id)
            return (
              <tr key={team.id}>
                <td className="border border-gray-400 px-1 py-1 text-center text-gray-400">{i + 1}</td>
                <td className="border border-gray-400 px-1 py-2">
                  <div className="font-medium">{team.name}</div>
                  {team.club && <div className="text-gray-400">{team.club}</div>}
                </td>
                {teams.map((_, j) => {
                  if (i === j) return <td key={j} className="border border-gray-400 bg-gray-300 text-center">╲</td>
                  const tie = grid[i][j]
                  if (!tie || !tie.winner_team_id) return <td key={j} className="border border-gray-400 px-1 py-1 text-center text-gray-200"></td>
                  const won = tie.winner_team_id === team.id
                  const myR = tie.team1_id === team.id ? tie.team1_rubbers : tie.team2_rubbers
                  const oppR = tie.team1_id === team.id ? tie.team2_rubbers : tie.team1_rubbers
                  return (
                    <td key={j} className={`border border-gray-400 px-0.5 py-1 text-center font-bold text-xs ${won ? 'bg-pink-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                      <div>{won ? '○' : '×'}</div>
                      <div className="text-xs">{myR}-{oppR}</div>
                    </td>
                  )
                })}
                <td className="border border-gray-400 px-1 py-1 text-center font-bold">{s?.wins ?? 0}</td>
                <td className="border border-gray-400 px-1 py-1 text-center">{s?.losses ?? 0}</td>
                <td className="border border-gray-400 px-1 py-1 text-center font-bold text-primary">{rankMap.get(team.id) ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────── 団体戦メンバー一覧 ────────────
function TeamMemberList({ teams, ties, rubbers }: { teams: Team[]; ties: Tie[]; rubbers: Rubber[] }) {
  if (teams.length === 0) return null

  // チームIDごとに選手名セットを構築（tie経由でteam1/team2を特定）
  const memberMap = new Map<string, Set<string>>()
  for (const team of teams) memberMap.set(team.id, new Set())

  for (const tie of ties) {
    const tieRubbers = rubbers.filter(r => r.tie_id === tie.id)
    for (const r of tieRubbers) {
      if (tie.team1_id) {
        const s = memberMap.get(tie.team1_id)
        if (s) { if (r.team1_p1) s.add(r.team1_p1); if (r.team1_p2) s.add(r.team1_p2) }
      }
      if (tie.team2_id) {
        const s = memberMap.get(tie.team2_id)
        if (s) { if (r.team2_p1) s.add(r.team2_p1); if (r.team2_p2) s.add(r.team2_p2) }
      }
    }
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">チームメンバー</div>
      <div className="divide-y divide-gray-100">
        {teams.map((team, idx) => {
          // members テキストフィールド優先、なければrubberから収集した名前
          const fromRubbers = Array.from(memberMap.get(team.id) ?? [])
          const fromTextField = team.members
            ? team.members.split(/[\n,、]/).map(s => s.trim()).filter(Boolean)
            : []
          const players = fromTextField.length > 0 ? fromTextField : fromRubbers

          return (
            <div key={team.id} className="px-3 py-2">
              <div className="font-bold text-sm">
                {idx + 1}. {team.name}
                {team.club && <span className="font-normal text-gray-400 ml-1">({team.club})</span>}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                {players.length > 0
                  ? players.map((p, i) => (
                      <div key={i} className="text-xs text-gray-700 border-b border-dotted border-gray-200 py-0.5">{p}</div>
                    ))
                  : Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="text-xs border-b border-dotted border-gray-300 py-1">&nbsp;</div>
                    ))
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────── メインページ ────────────
export default function ProgramPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [programs, setPrograms] = useState<BlockProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: t } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1)
    const tour = t?.[0]; if (!tour) { setLoading(false); return }
    setTournament(tour)

    const { data: cats } = await supabase.from('categories').select('*').eq('tournament_id', tour.id).order('sort_order')
    setCategories(cats ?? [])
    const catIds = (cats ?? []).map(c => c.id)
    if (catIds.length === 0) { setLoading(false); return }

    const { data: blocks } = await supabase.from('blocks').select('*').in('category_id', catIds).order('name')
    const blockIds = (blocks ?? []).map(b => b.id)
    if (blockIds.length === 0) { setLoading(false); return }

    const catMap = new Map((cats ?? []).map(c => [c.id, c]))

    // 個人戦 / 団体戦でデータ取得を分岐
    const individualBlockIds = (blocks ?? []).filter(b => catMap.get(b.category_id)?.type === 'individual').map(b => b.id)
    const teamBlockIds = (blocks ?? []).filter(b => catMap.get(b.category_id)?.type === 'team').map(b => b.id)

    const [
      { data: entries }, { data: matches },
      { data: teams }, { data: ties }, { data: rubbers },
    ] = await Promise.all([
      individualBlockIds.length > 0
        ? supabase.from('entries').select('*').in('block_id', individualBlockIds).order('sort_order')
        : Promise.resolve({ data: [] }),
      individualBlockIds.length > 0
        ? supabase.from('matches').select('*').in('block_id', individualBlockIds).order('match_order')
        : Promise.resolve({ data: [] }),
      teamBlockIds.length > 0
        ? supabase.from('teams').select('*').in('block_id', teamBlockIds).order('sort_order')
        : Promise.resolve({ data: [] }),
      teamBlockIds.length > 0
        ? supabase.from('ties').select('*').in('block_id', teamBlockIds).order('match_order')
        : Promise.resolve({ data: [] }),
      teamBlockIds.length > 0
        ? supabase.from('rubbers').select('*')
        : Promise.resolve({ data: [] }),
    ])

    const result: BlockProgram[] = (blocks ?? []).map(block => {
      const cat = catMap.get(block.category_id) ?? { id: '', tournament_id: '', type: 'individual' as const, name: '', code: null, format: null, sort_order: 0 }
      if (cat.type === 'team') {
        const blockTies = (ties ?? []).filter((tie: Tie) => tie.block_id === block.id)
        const tieIds = new Set(blockTies.map((tie: Tie) => tie.id))
        return {
          kind: 'team' as const, category: cat, block,
          teams: (teams ?? []).filter((t: Team) => t.block_id === block.id),
          ties: blockTies,
          rubbers: (rubbers ?? []).filter((r: Rubber) => tieIds.has(r.tie_id)),
        }
      }
      return {
        kind: 'individual' as const, category: cat, block,
        entries: (entries ?? []).filter((e: Entry) => e.block_id === block.id),
        matches: (matches ?? []).filter((m: Match) => m.block_id === block.id),
      }
    })

    setPrograms(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = selectedCat === 'all' ? programs : programs.filter(p => p.category.id === selectedCat)

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>

  // カテゴリでグループ化
  const catGroups = new Map<string, BlockProgram[]>()
  for (const p of filtered) {
    if (!catGroups.has(p.category.id)) catGroups.set(p.category.id, [])
    catGroups.get(p.category.id)!.push(p)
  }

  return (
    <div className="space-y-4 pb-10">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          .page-break { page-break-before: always; }
          table { font-size: 10px; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between">
        <h1 className="text-xl font-bold">📄 プログラム印刷</h1>
        <button onClick={() => window.print()} className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-bold">🖨️ 印刷</button>
      </div>

      {/* 種目フィルター */}
      <div className="no-print flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSelectedCat('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedCat === 'all' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
          全種目
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedCat === cat.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* 大会ヘッダー（印刷用） */}
      {tournament && (
        <div className="text-center border-b-2 border-gray-300 pb-3 mb-2">
          <div className="text-2xl font-bold">{tournament.name}</div>
          {tournament.date_range && <div className="text-sm text-gray-500">{tournament.date_range}</div>}
          {tournament.venue && <div className="text-sm text-gray-500">{tournament.venue}</div>}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 no-print">
          <div className="text-3xl mb-2">📋</div>
          <div>表示するデータがありません</div>
        </div>
      )}

      {Array.from(catGroups.entries()).map(([, progs], catIdx) => {
        const cat = progs[0].category
        return (
          <div key={cat.id} className={catIdx > 0 ? 'page-break' : ''}>
            <h2 className="text-lg font-bold border-b-2 border-primary pb-1 mb-3">
              {cat.name}
              <span className="ml-2 text-xs font-normal text-gray-500">
                {cat.type === 'individual' ? '個人戦' : '団体戦'}{cat.format ? ` / ${cat.format === 'singles' ? 'シングルス' : 'ダブルス'}` : ''}
              </span>
            </h2>

            {progs.map(prog => (
              <div key={prog.block.id} className="mb-6">
                <div className="bg-primary text-white px-3 py-2 rounded-t-xl font-bold text-sm">
                  {prog.block.name}　（{prog.kind === 'individual' ? prog.entries.length : prog.teams.length}
                  {prog.kind === 'individual' ? '名' : 'チーム'}）
                </div>
                <div className="border border-gray-300 rounded-b-xl overflow-hidden">
                  {prog.kind === 'individual' ? (
                    prog.entries.length > 0
                      ? <RoundRobinTable entries={prog.entries} matches={prog.matches} />
                      : <div className="text-center py-4 text-gray-400 text-sm no-print">
                          参加者未登録 — <a href="/admin/blocks" className="text-primary underline">ブロックページで追加</a>
                        </div>
                  ) : (
                    prog.teams.length > 0
                      ? <TeamRoundRobinTable teams={prog.teams} ties={prog.ties} />
                      : <div className="text-center py-4 text-gray-400 text-sm no-print">
                          チーム未登録 — <a href="/admin/blocks" className="text-primary underline">ブロックページで追加</a>
                        </div>
                  )}
                </div>

                {/* 団体戦メンバー */}
                {prog.kind === 'team' && prog.teams.length > 0 && (
                  <TeamMemberList teams={prog.teams} ties={prog.ties} rubbers={prog.rubbers} />
                )}

                {/* 個人戦: 対戦順 */}
                {prog.kind === 'individual' && prog.matches.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">対戦順</div>
                    <div className="divide-y divide-gray-100">
                      {prog.matches.map((m, idx) => {
                        const e1 = prog.entries.find(e => e.id === m.entry1_id)
                        const e2 = prog.entries.find(e => e.id === m.entry2_id)
                        return (
                          <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                            <span className="text-gray-400 w-5 shrink-0">{idx + 1}</span>
                            <span className="flex-1 text-right font-medium">{e1?.name ?? '—'}</span>
                            <span className="text-gray-300 shrink-0">vs</span>
                            <span className="flex-1 font-medium">{e2?.name ?? '—'}</span>
                            {m.status === '終了'
                              ? <span className="text-xs font-bold text-gray-600 shrink-0">{m.score1}-{m.score2}</span>
                              : <span className="text-xs text-gray-200 shrink-0 w-12 text-center">___-___</span>
                            }
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
