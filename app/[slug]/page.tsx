import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay'

export default async function TournamentPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('public_url', slug)
    .single()

  if (!tournament) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('tournament_id', tournament.id)
    .order('sort_order')

  const catIds = categories?.map(c => c.id) ?? []
  const { data: blocks } = await supabase.from('blocks').select('*').in('category_id', catIds)
  const blockIds = blocks?.map(b => b.id) ?? []

  const [{ data: matches }, { data: ties }] = await Promise.all([
    supabase.from('matches').select('id, status').in('block_id', blockIds),
    supabase.from('ties').select('id, status').in('block_id', blockIds),
  ])

  function progress(blockId: string, type: 'individual' | 'team') {
    if (type === 'individual') {
      const bms = matches?.filter(m => {
        const b = blocks?.find(b => b.id === blockId)
        return b?.id === blockId
      }) ?? []
      const done = bms.filter(m => m.status === '終了').length
      return { done, total: bms.length }
    }
    const bts = ties?.filter(t => {
      const b = blocks?.find(b => b.id === blockId)
      return b?.id === blockId
    }) ?? []
    const done = bts.filter(t => t.status === '終了').length
    return { done, total: bts.length }
  }

  const now = new Date().toLocaleString('ja-JP')

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-primary text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-sm opacity-70 mb-1">速報</div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          {tournament.date_range && <div className="opacity-80 text-sm mt-1">{tournament.date_range}</div>}
          {tournament.venue && <div className="opacity-80 text-sm">{tournament.venue}</div>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="text-xs text-gray-400 text-right">最終更新: {now}</div>

        {categories?.map(cat => {
          const catBlocks = blocks?.filter(b => b.category_id === cat.id) ?? []
          return (
            <div key={cat.id}>
              <h2 className="font-bold text-base mb-3 flex items-center gap-2">
                <span>{cat.name}</span>
                <span className="text-xs font-normal text-gray-400">
                  {cat.type === 'individual' ? '個人戦' : '団体戦'}
                </span>
              </h2>
              <div className="space-y-3">
                {catBlocks.map(block => {
                  const p = progress(block.id, cat.type as 'individual' | 'team')
                  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
                  const link = cat.type === 'individual'
                    ? `/${slug}/block/${block.id}`
                    : `/${slug}/tie/${block.id}`

                  return (
                    <Link key={block.id} href={link} className="block bg-white rounded-2xl shadow-sm p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{block.name}</div>
                        <div className="text-xs text-gray-400">{p.done}/{p.total} 終了</div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-done rounded-full h-2 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="border-t border-gray-200 pt-6">
          <QRCodeDisplay slug={slug} size={160} />
        </div>
      </div>
    </div>
  )
}
