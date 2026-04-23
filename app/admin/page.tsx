import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PhaseGuide } from '@/components/layout/PhaseGuide'
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  const activeTournament = tournaments?.find(t => t.status === '進行中') ?? tournaments?.[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🏸 シャトルボード</h1>
        <Link
          href="/admin/setup"
          className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-bold"
        >
          + 新しい大会
        </Link>
      </div>

      {tournaments && tournaments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">現在の大会</div>
          <select className="w-full text-base font-bold border-0 bg-transparent focus:outline-none">
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {activeTournament ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-lg font-bold">{activeTournament.name}</div>
            {activeTournament.date_range && (
              <div className="text-gray-500 text-sm">{activeTournament.date_range}</div>
            )}
            {activeTournament.venue && (
              <div className="text-gray-500 text-sm">{activeTournament.venue}</div>
            )}
            <div className="mt-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                activeTournament.status === '進行中' ? 'bg-in-progress text-white' :
                activeTournament.status === '終了' ? 'bg-done text-white' :
                'bg-gray-100 text-gray-600'
              }`}>
                {activeTournament.status}
              </span>
            </div>
          </div>

          {activeTournament.status === '準備中' && (
            <PhaseGuide
              step="ブロック分け・対戦生成"
              description="参加者のブロック分けと対戦を自動生成します"
              href="/admin/setup"
            />
          )}
          {activeTournament.status === '進行中' && (
            <PhaseGuide
              step="試合進行へ"
              description="試合結果の入力はこちら"
              href="/admin/matches"
            />
          )}

          {activeTournament.public_url && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">速報QRコード</div>
              <QRCodeDisplay slug={activeTournament.public_url} size={150} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/draw" className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">🗂️</div>
              <div className="font-bold text-sm">組み合わせ</div>
            </Link>
            <Link href="/admin/matches" className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">▶️</div>
              <div className="font-bold text-sm">試合進行</div>
            </Link>
            <Link href="/admin/results" className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="font-bold text-sm">結果確認</div>
            </Link>
            <Link href="/admin/qr" className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">📲</div>
              <div className="font-bold text-sm">QR印刷</div>
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🏸</div>
          <div className="text-gray-500 mb-4">まだ大会がありません</div>
          <Link
            href="/admin/setup"
            className="bg-primary text-white rounded-2xl px-8 py-4 font-bold text-lg inline-block"
          >
            最初の大会を作成する
          </Link>
        </div>
      )}
    </div>
  )
}
