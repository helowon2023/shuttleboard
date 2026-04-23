import type { Entry, Match } from '@/lib/types'

interface RoundRobinGridProps {
  entries: Entry[]
  matches: Match[]
}

export function RoundRobinGrid({ entries, matches }: RoundRobinGridProps) {
  function getScore(e1Id: string, e2Id: string) {
    const m = matches.find(
      m => (m.entry1_id === e1Id && m.entry2_id === e2Id) ||
           (m.entry1_id === e2Id && m.entry2_id === e1Id)
    )
    if (!m || m.status !== '終了') return '-'
    if (m.entry1_id === e1Id) {
      return `${m.score1 ?? '-'}-${m.score2 ?? '-'}`
    } else {
      return `${m.score2 ?? '-'}-${m.score1 ?? '-'}`
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-2 py-2 text-left min-w-[80px]">名前</th>
            {entries.map((e, i) => (
              <th key={e.id} className="border border-gray-200 bg-gray-50 px-2 py-2 text-center min-w-[50px]">
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e1, i) => (
            <tr key={e1.id}>
              <td className="border border-gray-200 px-2 py-2 font-medium bg-gray-50">
                <span className="text-gray-400 mr-1">{i + 1}</span>{e1.name}
              </td>
              {entries.map(e2 => (
                <td
                  key={e2.id}
                  className={`border border-gray-200 px-2 py-2 text-center ${
                    e1.id === e2.id ? 'bg-gray-200' : ''
                  }`}
                >
                  {e1.id === e2.id ? '×' : getScore(e1.id, e2.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
