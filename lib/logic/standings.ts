import type { Entry, Match, Standing } from '@/lib/types'

export function computeStandings(entries: Entry[], matches: Match[]): Standing[] {
  const map = new Map<string, Standing>()

  for (const entry of entries) {
    map.set(entry.id, {
      entry,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      diff: 0,
      rank: 0,
    })
  }

  for (const m of matches) {
    if (m.status !== '終了' || m.winner_id === null) continue
    const s1 = map.get(m.entry1_id!)
    const s2 = map.get(m.entry2_id!)
    if (!s1 || !s2) continue

    const score1 = m.score1 ?? 0
    const score2 = m.score2 ?? 0

    s1.points_for += score1
    s1.points_against += score2
    s2.points_for += score2
    s2.points_against += score1

    if (m.winner_id === m.entry1_id) {
      s1.wins++
      s2.losses++
    } else {
      s2.wins++
      s1.losses++
    }
  }

  Array.from(map.values()).forEach(s => {
    s.diff = s.points_for - s.points_against
  })

  const list = Array.from(map.values())

  list.sort((a, b) => {
    const winDiff = b.wins - a.wins
    if (winDiff !== 0) return winDiff

    const diffDiff = b.diff - a.diff
    if (diffDiff !== 0) return diffDiff

    // 直接対決
    const direct = getDirectResult(a.entry.id, b.entry.id, matches)
    return direct
  })

  let rank = 1
  for (let i = 0; i < list.length; i++) {
    if (i > 0) {
      const prev = list[i - 1]
      const cur = list[i]
      if (prev.wins === cur.wins && prev.diff === cur.diff) {
        list[i].rank = prev.rank
      } else {
        rank = i + 1
        list[i].rank = rank
      }
    } else {
      list[0].rank = 1
    }
  }

  return list
}

function getDirectResult(a: string, b: string, matches: Match[]): number {
  for (const m of matches) {
    if (m.status !== '終了') continue
    if (m.entry1_id === a && m.entry2_id === b) {
      return m.winner_id === a ? -1 : 1
    }
    if (m.entry1_id === b && m.entry2_id === a) {
      return m.winner_id === b ? 1 : -1
    }
  }
  return 0
}
