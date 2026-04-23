'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MatchCard } from '@/components/individual/MatchCard'
import { ScoreInput } from '@/components/individual/ScoreInput'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { Match, Entry, Block, Category, Tournament, Team, Tie, Rubber } from '@/lib/types'
import { resolveTie } from '@/lib/logic/tieResolver'
import { RubberInput } from '@/components/team/RubberInput'
import { TieCard } from '@/components/team/TieCard'

export default function MatchesPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [ties, setTies] = useState<Tie[]>([])
  const [rubbers, setRubbers] = useState<Rubber[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedTie, setSelectedTie] = useState<Tie | null>(null)
  const [filterCat, setFilterCat] = useState('all')
  const { showToast, ToastContainer } = useToast()

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: t } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1)
    const tour = t?.[0]
    if (!tour) { setLoading(false); return }
    setTournament(tour)

    const { data: cats } = await supabase.from('categories').select('*').eq('tournament_id', tour.id).order('sort_order')
    setCategories(cats ?? [])

    const catIds = cats?.map(c => c.id) ?? []
    const { data: blks } = await supabase.from('blocks').select('*').in('category_id', catIds)
    setBlocks(blks ?? [])

    const blockIds = blks?.map(b => b.id) ?? []

    const [{ data: ents }, { data: mtchs }, { data: tms }, { data: ts }, { data: rubs }] = await Promise.all([
      supabase.from('entries').select('*').in('block_id', blockIds).order('sort_order'),
      supabase.from('matches').select('*').in('block_id', blockIds).order('match_order'),
      supabase.from('teams').select('*').in('block_id', blockIds).order('sort_order'),
      supabase.from('ties').select('*').in('block_id', blockIds).order('match_order'),
      supabase.from('rubbers').select('*'),
    ])

    setEntries(ents ?? [])
    setMatches(mtchs ?? [])
    setTeams(tms ?? [])
    setTies(ts ?? [])
    setRubbers(rubs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('matches-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rubbers' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ties' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function handleScoreSubmit(score1: number, score2: number, court: string) {
    if (!selectedMatch) return
    const supabase = createClient()
    const winner_id = score1 > score2 ? selectedMatch.entry1_id : selectedMatch.entry2_id
    await supabase.from('matches').update({
      score1, score2, winner_id, court: court || null, status: '終了',
      played_at: new Date().toISOString(),
    }).eq('id', selectedMatch.id)
    showToast('スコアを保存しました')
    setSelectedMatch(null)
    load()
  }

  async function handleRubberSubmit(rubber: Rubber, data: Partial<Rubber>) {
    const supabase = createClient()
    await supabase.from('rubbers').update({ ...data, played_at: new Date().toISOString() }).eq('id', rubber.id)

    // タイの勝者を自動判定
    if (selectedTie) {
      const tieRubbers = rubbers.filter(r => r.tie_id === selectedTie.id)
      const updatedRubbers = tieRubbers.map(r => r.id === rubber.id ? { ...r, ...data } : r)
      const { winnerId, team1Wins, team2Wins } = resolveTie(
        updatedRubbers as Rubber[],
        tieRubbers.length,
        selectedTie.team1_id!,
        selectedTie.team2_id!,
      )
      await supabase.from('ties').update({
        team1_rubbers: team1Wins,
        team2_rubbers: team2Wins,
        winner_team_id: winnerId,
        status: winnerId ? '終了' : '進行中',
      }).eq('id', selectedTie.id)
    }
    load()
    showToast('種目を保存しました')
  }

  const filteredBlocks = filterCat === 'all'
    ? blocks
    : blocks.filter(b => {
        const cat = categories.find(c => c.id === b.category_id)
        return cat?.id === filterCat
      })

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  const inProgress = matches.filter(m => m.status === '進行中')
  const pending = matches.filter(m => m.status === '未試合')
  const done = matches.filter(m => m.status === '終了')

  return (
    <div className="space-y-5 pb-8">
      <ToastContainer />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">▶ 試合進行</h1>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
        >
          <option value="all">全種目</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* 個人戦 試合 */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-in-progress mb-2">🔴 進行中 ({inProgress.length}試合)</h2>
          <div className="space-y-3">
            {inProgress.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                entry1={entries.find(e => e.id === m.entry1_id)}
                entry2={entries.find(e => e.id === m.entry2_id)}
                onInputClick={setSelectedMatch}
                showEditButton
              />
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">⏳ 待機中 ({pending.length}試合)</h2>
          <div className="space-y-3">
            {pending.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                entry1={entries.find(e => e.id === m.entry1_id)}
                entry2={entries.find(e => e.id === m.entry2_id)}
                onInputClick={setSelectedMatch}
              />
            ))}
          </div>
        </section>
      )}

      {/* 団体戦 タイ */}
      {ties.filter(t => t.status !== '終了').length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">🏆 団体戦</h2>
          <div className="space-y-3">
            {ties.filter(t => t.status !== '終了').map(tie => (
              <div key={tie.id} onClick={() => setSelectedTie(tie)} className="cursor-pointer">
                <TieCard
                  tie={tie}
                  team1={teams.find(t => t.id === tie.team1_id)}
                  team2={teams.find(t => t.id === tie.team2_id)}
                  rubbers={rubbers.filter(r => r.tie_id === tie.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <details>
            <summary className="text-sm font-bold text-done mb-2 cursor-pointer">
              ✅ 終了 ({done.length}試合)
            </summary>
            <div className="space-y-3 mt-3">
              {done.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  entry1={entries.find(e => e.id === m.entry1_id)}
                  entry2={entries.find(e => e.id === m.entry2_id)}
                  onInputClick={setSelectedMatch}
                  showEditButton
                />
              ))}
            </div>
          </details>
        </section>
      )}

      {matches.length === 0 && ties.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🏸</div>
          <div>試合がまだありません</div>
        </div>
      )}

      {/* スコア入力モーダル */}
      {selectedMatch && (
        <Modal
          title="スコア入力"
          onClose={() => setSelectedMatch(null)}
        >
          <ScoreInput
            match={selectedMatch}
            entry1={entries.find(e => e.id === selectedMatch.entry1_id)}
            entry2={entries.find(e => e.id === selectedMatch.entry2_id)}
            onSubmit={handleScoreSubmit}
            onCancel={() => setSelectedMatch(null)}
          />
        </Modal>
      )}

      {/* 団体戦タイモーダル */}
      {selectedTie && (
        <Modal
          title="団体戦 種目入力"
          onClose={() => setSelectedTie(null)}
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="font-bold text-lg">
                {teams.find(t => t.id === selectedTie.team1_id)?.name}
                <span className="mx-2 text-2xl font-bold text-primary">
                  {selectedTie.team1_rubbers} - {selectedTie.team2_rubbers}
                </span>
                {teams.find(t => t.id === selectedTie.team2_id)?.name}
              </div>
              {selectedTie.winner_team_id && (
                <div className="mt-2 text-done font-bold">
                  🏆 {teams.find(t => t.id === selectedTie.winner_team_id)?.name} 勝利！
                </div>
              )}
            </div>
            {rubbers
              .filter(r => r.tie_id === selectedTie.id)
              .sort((a, b) => a.rubber_no - b.rubber_no)
              .map(rubber => (
                <RubberInput
                  key={rubber.id}
                  rubber={rubber}
                  team1={teams.find(t => t.id === selectedTie.team1_id)}
                  team2={teams.find(t => t.id === selectedTie.team2_id)}
                  onSubmit={(data) => handleRubberSubmit(rubber, data)}
                />
              ))
            }
          </div>
        </Modal>
      )}
    </div>
  )
}
