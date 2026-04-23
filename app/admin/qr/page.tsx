import { createClient } from '@/lib/supabase/server'
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay'

export default async function QRPage() {
  const supabase = await createClient()
  const { data: t } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1)
  const tournament = t?.[0]

  if (!tournament?.public_url) {
    return <div className="text-center py-12 text-gray-400">大会の速報URLが設定されていません</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold no-print">📲 QRコード印刷</h1>
      <div className="text-center py-8 print-only">
        <div className="text-3xl font-bold mb-2">{tournament.name}</div>
        {tournament.date_range && <div className="text-gray-500">{tournament.date_range}</div>}
        {tournament.venue && <div className="text-gray-500">{tournament.venue}</div>}
        <div className="mt-2 text-sm text-gray-400">大会速報はこちら</div>
      </div>
      <div className="flex justify-center">
        <QRCodeDisplay slug={tournament.public_url} size={280} />
      </div>
      <p className="text-center text-sm text-gray-500 no-print">
        「QRコードを印刷」ボタンを押すとA4で印刷できます
      </p>
    </div>
  )
}
