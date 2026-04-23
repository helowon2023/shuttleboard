import type { Tie, Team, Rubber } from '@/lib/types'
import Link from 'next/link'

interface TieCardProps {
  tie: Tie
  team1?: Team
  team2?: Team
  rubbers?: Rubber[]
  slug?: string
  showLink?: boolean
}

export function TieCard({ tie, team1, team2, rubbers = [], showLink, slug }: TieCardProps) {
  const statusColorMap: Record<string, string> = {
    '未試合': 'border-gray-200',
    '呼び出し中': 'border-yellow-400 bg-yellow-50',
    '進行中': 'border-in-progress bg-red-50',
    '終了': 'border-done/30 bg-green-50/30',
  }
  const statusColor = statusColorMap[tie.status] ?? 'border-gray-200'

  const content = (
    <div className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${statusColor}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          tie.status === '進行中' ? 'bg-in-progress text-white' :
          tie.status === '終了' ? 'bg-done text-white' :
          'bg-gray-100 text-gray-500'
        }`}>
          {tie.status}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className={`flex-1 text-center ${tie.winner_team_id === team1?.id ? 'text-primary font-bold' : ''}`}>
          {team1?.name ?? 'TBD'}
        </div>
        <div className="text-3xl font-bold text-center">
          <span className={tie.winner_team_id === team1?.id ? 'text-primary' : 'text-gray-400'}>
            {tie.team1_rubbers}
          </span>
          <span className="text-gray-300 mx-1">-</span>
          <span className={tie.winner_team_id === team2?.id ? 'text-primary' : 'text-gray-400'}>
            {tie.team2_rubbers}
          </span>
        </div>
        <div className={`flex-1 text-center ${tie.winner_team_id === team2?.id ? 'text-primary font-bold' : ''}`}>
          {team2?.name ?? 'TBD'}
        </div>
      </div>

      {rubbers.length > 0 && (
        <div className="space-y-1">
          {rubbers.map(r => (
            <div key={r.id} className="flex items-center text-xs gap-2 py-1 border-t border-gray-100">
              <span className="text-gray-500 w-24 shrink-0">{r.label}</span>
              <span className="flex-1 text-center truncate">
                {r.team1_p1 ?? '未定'}{r.team1_p2 ? `/${r.team1_p2}` : ''}
              </span>
              <span className="font-bold">
                {r.status === '終了' ? `${r.score1}-${r.score2}` : '-'}
              </span>
              <span className="flex-1 text-center truncate">
                {r.team2_p1 ?? '未定'}{r.team2_p2 ? `/${r.team2_p2}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (showLink && slug) {
    return <Link href={`/${slug}/tie/${tie.id}`}>{content}</Link>
  }
  return content
}
