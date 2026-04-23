import type { Standing } from '@/lib/types'

interface StandingsTableProps {
  standings: Standing[]
}

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-gray-500">順位</th>
            <th className="px-3 py-3 text-left font-medium text-gray-500">名前</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">勝</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">負</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">得</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">失</th>
            <th className="px-3 py-3 text-center font-medium text-gray-500">差</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.entry.id}
              className={`border-b border-gray-100 last:border-0 ${
                s.rank === 1 ? 'bg-accent/10' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              <td className="px-3 py-3 font-bold text-center">
                {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : s.rank}
              </td>
              <td className="px-3 py-3 font-medium">
                {s.entry.name}
                {s.entry.player2 && <span className="text-gray-400"> / {s.entry.player2}</span>}
                {s.entry.club && <div className="text-xs text-gray-400">{s.entry.club}</div>}
              </td>
              <td className="px-3 py-3 text-center font-bold text-done">{s.wins}</td>
              <td className="px-3 py-3 text-center text-gray-500">{s.losses}</td>
              <td className="px-3 py-3 text-center">{s.points_for}</td>
              <td className="px-3 py-3 text-center">{s.points_against}</td>
              <td className={`px-3 py-3 text-center font-medium ${s.diff >= 0 ? 'text-done' : 'text-in-progress'}`}>
                {s.diff > 0 ? '+' : ''}{s.diff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
