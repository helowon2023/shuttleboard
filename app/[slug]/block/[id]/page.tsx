'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeStandings } from '@/lib/logic/standings'
import { StandingsTable } from '@/components/individual/StandingsTable'
import { RoundRobinGrid } from '@/components/individual/RoundRobinGrid'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { Block, Entry, Match } from '@/lib/types'
import { useParams } from 'next/navigation'

type Tab = 'standings' | 'results' | 'grid'

export default function BlockPublicPage() {
  const params = useParams()
  const blockId = params.id as string
  const slug = params.slug as string

  const [block, setBlock] = useState<Block | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('standings')
  const [lastUpdated, setLastUpdated] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: b }, { data: e }, { data: m }] = await Promise.all([
      supabase.from('blocks').select('*').eq('id', blockId).single(),
      supabase.from('entries').select('*').eq('block_id', blockId).order('sort_order'),
      supabase.from('matches').select('*').eq('block_id', blockId).order('match_order'),
    ])
    setBlock(b)
    setEntries(e ?? [])
    setMatches(m ?? [])
    setLastUpdated(new Date().toLocaleTimeString('ja-JP'))
    setLoading(false)
  }, [blockId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`block-${blockId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `block_id=eq.${blockId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [blockId, load])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {[1,2,3].map(i => <SkeletonCard key={i} />)}
    </div>
  )

  const standings = computeStandings(entries, matches)
  const doneMatches = matches.filter(m => m.status === '終了')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'standings', label: '順位表' },
    { id: 'results', label: '試合結果' },
    { id: 'grid', label: '対戦表' },
  ]

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-primary text-white py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-sm opacity-70 mb-1">
            <a href={`/${slug}`} className="underline">← 大会トップ</a>
          </div>
          <h1 className="text-xl font-bold">{block?.name ?? 'ブロック'}</h1>
          <div className="text-xs opacity-60 mt-1">最終更新: {lastUpdated}</div>
        </div>
      </div>

      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {tab === 'standings' && (
          <div>
            <StandingsTable standings={standings} />
            {standings[0] && (
              <div className="mt-4 bg-accent/10 border border-accent/30 rounded-2xl p-4 text-center">
                <div className="text-xs text-accent font-bold mb-1">🥇 1位</div>
                <div className="font-bold text-lg">{standings[0].entry.name}</div>
                {standings[0].entry.club && <div className="text-sm text-gray-500">{standings[0].entry.club}</div>}
              </div>
            )}
          </div>
        )}

        {tab === 'results' && (
          <div className="space-y-2">
            {doneMatches.length === 0 && <div className="text-center text-gray-400 py-8">まだ試合結果がありません</div>}
            {doneMatches.map(m => {
              const e1 = entries.find(e => e.id === m.entry1_id)
              const e2 = entries.find(e => e.id === m.entry2_id)
              return (
                <div key={m.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  <div className={`flex-1 text-right text-sm ${m.winner_id === m.entry1_id ? 'font-bold text-primary' : 'text-gray-500'}`}>
                    {e1?.name}
                  </div>
                  <div className="text-center font-bold tabular-nums">
                    {m.score1} - {m.score2}
                  </div>
                  <div className={`flex-1 text-sm ${m.winner_id === m.entry2_id ? 'font-bold text-primary' : 'text-gray-500'}`}>
                    {e2?.name}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'grid' && (
          <RoundRobinGrid entries={entries} matches={matches} />
        )}
      </div>
    </div>
  )
}
