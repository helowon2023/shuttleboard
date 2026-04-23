import type { Match, Entry } from '@/lib/types'

interface MatchCardProps {
  match: Match
  entry1?: Entry
  entry2?: Entry
  onInputClick?: (match: Match) => void
  showEditButton?: boolean
}

export function MatchCard({ match, entry1, entry2, onInputClick, showEditButton }: MatchCardProps) {
  const statusColor: Record<string, string> = {
    '未試合': 'border-gray-200',
    '呼び出し中': 'border-yellow-400 bg-yellow-50',
    '進行中': 'border-in-progress bg-red-50',
    '終了': 'border-done/30 bg-green-50/30',
  }
  const cardColor = statusColor[match.status] ?? 'border-gray-200'

  return (
    <div className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${cardColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          match.status === '進行中' ? 'bg-in-progress text-white' :
          match.status === '終了' ? 'bg-done text-white' :
          'bg-gray-100 text-gray-500'
        }`}>
          {match.status}
        </span>
        {match.court && (
          <span className="text-xs text-gray-500">コート{match.court}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <div className="font-bold text-sm">{entry1?.name ?? 'TBD'}</div>
          {entry1?.club && <div className="text-xs text-gray-400">{entry1.club}</div>}
        </div>

        <div className="flex items-center gap-2 text-2xl font-bold">
          {match.status === '終了' ? (
            <>
              <span className={match.winner_id === match.entry1_id ? 'text-primary' : 'text-gray-400'}>
                {match.score1 ?? 0}
              </span>
              <span className="text-gray-300 text-lg">-</span>
              <span className={match.winner_id === match.entry2_id ? 'text-primary' : 'text-gray-400'}>
                {match.score2 ?? 0}
              </span>
            </>
          ) : (
            <span className="text-gray-300 text-base">vs</span>
          )}
        </div>

        <div className="flex-1 text-center">
          <div className="font-bold text-sm">{entry2?.name ?? 'TBD'}</div>
          {entry2?.club && <div className="text-xs text-gray-400">{entry2.club}</div>}
        </div>
      </div>

      {onInputClick && match.status !== '終了' && (
        <button
          onClick={() => onInputClick(match)}
          className="mt-3 w-full bg-primary text-white rounded-xl py-3 font-bold"
        >
          結果入力
        </button>
      )}
      {showEditButton && match.status === '終了' && onInputClick && (
        <button
          onClick={() => onInputClick(match)}
          className="mt-3 w-full bg-gray-100 text-gray-600 rounded-xl py-2 text-sm font-medium"
        >
          修正
        </button>
      )}
    </div>
  )
}
