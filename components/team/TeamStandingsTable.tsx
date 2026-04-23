import type { TeamStanding } from '@/lib/types'

export function TeamStandingsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-gray-500">順位</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">チーム</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">勝</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">負</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">種目勝</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team.id} className={`border-b border-gray-100 last:border-0 ${s.rank === 1 ? 'bg-accent/10' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <td className="px-3 py-3 font-bold text-center">
                {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : s.rank}
              </td>
              <td className="px-3 py-3 font-medium">
                {s.team.name}
                {s.team.club && <div className="text-xs text-gray-400">{s.team.club}</div>}
              </td>
              <td className="px-3 py-3 text-center font-bold text-done">{s.tie_wins}</td>
              <td className="px-3 py-3 text-center text-gray-500">{s.tie_losses}</td>
              <td className="px-3 py-3 text-center">{s.rubber_wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
