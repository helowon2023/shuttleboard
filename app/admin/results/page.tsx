import { createClient } from '@/lib/supabase/server'
import { computeStandings } from '@/lib/logic/standings'
import { computeTeamStandings } from '@/lib/logic/teamStandings'
import { StandingsTable } from '@/components/individual/StandingsTable'
import { TeamStandingsTable } from '@/components/team/TeamStandingsTable'
import Link from 'next/link'
import { PrintButton } from '@/components/ui/PrintButton'

export default async function ResultsPage() {
  const supabase = await createClient()

  const { data: t } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1)
  const tournament = t?.[0]
  if (!tournament) return <div className="text-center py-12 text-gray-400">大会がありません</div>

  const { data: categories } = await supabase.from('categories').select('*').eq('tournament_id', tournament.id).order('sort_order')
  const { data: blocks } = await supabase.from('blocks').select('*').in('category_id', categories?.map(c => c.id) ?? [])
  const blockIds = blocks?.map(b => b.id) ?? []

  const [{ data: entries }, { data: matches }, { data: teams }, { data: ties }] = await Promise.all([
    supabase.from('entries').select('*').in('block_id', blockIds).order('sort_order'),
    supabase.from('matches').select('*').in('block_id', blockIds),
    supabase.from('teams').select('*').in('block_id', blockIds).order('sort_order'),
    supabase.from('ties').select('*').in('block_id', blockIds),
  ])

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📊 結果確認</h1>
        <div className="flex gap-2">
          <Link href="/admin/qr" className="text-sm text-primary border border-primary rounded-xl px-3 py-2 no-print">QR印刷</Link>
          <PrintButton />
        </div>
      </div>

      {categories?.map(cat => {
        const catBlocks = blocks?.filter(b => b.category_id === cat.id) ?? []

        if (cat.type === 'individual') {
          return (
            <div key={cat.id} className="space-y-4">
              <h2 className="font-bold text-base bg-primary text-white rounded-xl px-4 py-3">{cat.name}</h2>
              {catBlocks.map(block => {
                const blockEntries = entries?.filter(e => e.block_id === block.id) ?? []
                const blockMatches = matches?.filter(m => m.block_id === block.id) ?? []
                const standings = computeStandings(blockEntries, blockMatches)
                return (
                  <div key={block.id}>
                    <div className="font-medium text-gray-600 mb-2">{block.name}</div>
                    <StandingsTable standings={standings} />
                  </div>
                )
              })}
            </div>
          )
        } else {
          return (
            <div key={cat.id} className="space-y-4">
              <h2 className="font-bold text-base bg-primary text-white rounded-xl px-4 py-3">{cat.name}</h2>
              {catBlocks.map(block => {
                const blockTeams = teams?.filter(t => t.block_id === block.id) ?? []
                const blockTies = ties?.filter(t => t.block_id === block.id) ?? []
                const standings = computeTeamStandings(blockTeams, blockTies)
                return (
                  <div key={block.id}>
                    <div className="font-medium text-gray-600 mb-2">{block.name}</div>
                    <TeamStandingsTable standings={standings} />
                  </div>
                )
              })}
            </div>
          )
        }
      })}
    </div>
  )
}
