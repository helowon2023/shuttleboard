'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { Tie, Team, Rubber } from '@/lib/types'
import { useParams } from 'next/navigation'

export default function TiePublicPage() {
  const params = useParams()
  const tieId = params.id as string
  const slug = params.slug as string

  const [tie, setTie] = useState<Tie | null>(null)
  const [team1, setTeam1] = useState<Team | null>(null)
  const [team2, setTeam2] = useState<Team | null>(null)
  const [rubbers, setRubbers] = useState<Rubber[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: t } = await supabase.from('ties').select('*').eq('id', tieId).single()
    if (!t) { setLoading(false); return }
    setTie(t)

    const [{ data: t1 }, { data: t2 }, { data: rubs }] = await Promise.all([
      supabase.from('teams').select('*').eq('id', t.team1_id).single(),
      supabase.from('teams').select('*').eq('id', t.team2_id).single(),
      supabase.from('rubbers').select('*').eq('tie_id', tieId).order('rubber_no'),
    ])

    setTeam1(t1)
    setTeam2(t2)
    setRubbers(rubs ?? [])
    setLastUpdated(new Date().toLocaleTimeString('ja-JP'))
    setLoading(false)
  }, [tieId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`tie-pub-${tieId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rubbers', filter: `tie_id=eq.${tieId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ties', filter: `id=eq.${tieId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tieId, load])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {[1,2].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  if (!tie) return <div className="text-center py-12 text-gray-400">タイが見つかりません</div>

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-primary text-white py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-sm opacity-70 mb-1">
            <a href={`/${slug}`} className="underline">← 大会トップ</a>
          </div>
          <h1 className="text-xl font-bold">団体戦</h1>
          <div className="text-xs opacity-60 mt-1">最終更新: {lastUpdated}</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* スコアボード */}
        <div className={`bg-white rounded-3xl shadow-lg p-6 text-center ${tie.winner_team_id ? 'border-2 border-done' : ''}`}>
          <div className="grid grid-cols-3 items-center gap-4">
            <div className={`${tie.winner_team_id === team1?.id ? 'text-primary font-bold' : 'text-gray-700'}`}>
              <div className="text-lg font-bold">{team1?.name}</div>
              {team1?.club && <div className="text-xs text-gray-400">{team1.club}</div>}
            </div>
            <div>
              <div className="text-5xl font-bold tabular-nums">
                <span className={tie.winner_team_id === team1?.id ? 'text-primary' : 'text-gray-400'}>
                  {tie.team1_rubbers}
                </span>
                <span className="text-gray-300 mx-2">-</span>
                <span className={tie.winner_team_id === team2?.id ? 'text-primary' : 'text-gray-400'}>
                  {tie.team2_rubbers}
                </span>
              </div>
              <div className={`text-xs mt-1 ${
                tie.status === '進行中' ? 'text-in-progress' :
                tie.status === '終了' ? 'text-done' : 'text-gray-400'
              }`}>
                {tie.status}
              </div>
            </div>
            <div className={`${tie.winner_team_id === team2?.id ? 'text-primary font-bold' : 'text-gray-700'}`}>
              <div className="text-lg font-bold">{team2?.name}</div>
              {team2?.club && <div className="text-xs text-gray-400">{team2.club}</div>}
            </div>
          </div>

          {tie.winner_team_id && (
            <div className="mt-4 text-done font-bold text-lg">
              🏆 {tie.winner_team_id === team1?.id ? team1?.name : team2?.name} 勝利！
            </div>
          )}
        </div>

        {/* 各種目 */}
        <div className="space-y-3">
          {rubbers.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${
              r.status === '終了' ? (r.winner_team_id === team1?.id ? 'border-primary' : r.winner_team_id === team2?.id ? 'border-in-progress' : 'border-gray-200') : 'border-gray-200'
            }`}>
              <div className="text-xs font-bold text-gray-400 mb-2">{r.label}</div>
              <div className="grid grid-cols-3 items-center gap-2">
                <div className="text-sm">
                  <div className={r.winner_team_id === team1?.id ? 'font-bold text-primary' : ''}>{r.team1_p1 ?? '未定'}</div>
                  {r.team1_p2 && <div className={r.winner_team_id === team1?.id ? 'font-bold text-primary' : ''}>{r.team1_p2}</div>}
                </div>
                <div className="text-center font-bold tabular-nums">
                  {r.status === '終了' ? `${r.score1} - ${r.score2}` : <span className="text-gray-300">-</span>}
                </div>
                <div className="text-sm text-right">
                  <div className={r.winner_team_id === team2?.id ? 'font-bold text-primary' : ''}>{r.team2_p1 ?? '未定'}</div>
                  {r.team2_p2 && <div className={r.winner_team_id === team2?.id ? 'font-bold text-primary' : ''}>{r.team2_p2}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
