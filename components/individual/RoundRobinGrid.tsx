import type { Entry, Match } from '@/lib/types'

interface RoundRobinGridProps {
  entries: Entry[]
  matches: Match[]
}

export function RoundRobinGrid({ entries, matches }: RoundRobinGridProps) {
  function getMatchInfo(e1Id: string, e2Id: string) {
    const m = matches.find(
      m => (m.entry1_id === e1Id && m.entry2_id === e2Id) ||
           (m.entry1_id === e2Id && m.entry2_id === e1Id)
    )
    if (!m || m.status !== '終了') return null
    const myScore = m.entry1_id === e1Id ? m.score1 : m.score2
    const oppScore = m.entry1_id === e1Id ? m.score2 : m.score1
    const won = m.winner_id === e1Id
    return { myScore, oppScore, won }
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-100 px-2 py-2 text-left min-w-[80px]">名前</th>
            {entries.map((e, i) => (
              <th key={e.id} className="border border-gray-300 bg-gray-100 px-2 py-2 text-center min-w-[52px]">
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e1, i) => (
            <tr key={e1.id}>
              <td className="border border-gray-300 px-2 py-2 font-medium bg-gray-50">
                <span className="text-gray-400 mr-1">{i + 1}</span>{e1.name}
              </td>
              {entries.map(e2 => {
                if (e1.id === e2.id) {
                  return (
                    <td key={e2.id} className="border border-gray-300 bg-gray-300 text-center text-gray-500">╲</td>
                  )
                }
                const info = getMatchInfo(e1.id, e2.id)
                if (!info) {
                  return <td key={e2.id} className="border border-gray-300 px-1 py-2 text-center text-gray-200"></td>
                }
                return (
                  <td key={e2.id}
                    className={`border border-gray-300 px-0.5 py-1 text-center font-bold ${info.won ? 'bg-pink-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    <div className="text-xs">{info.won ? '○' : '×'}</div>
                    <div className="text-xs">{info.myScore}-{info.oppScore}</div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
