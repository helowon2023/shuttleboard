import type { Team, Tie, TeamStanding } from '@/lib/types'

export function computeTeamStandings(teams: Team[], ties: Tie[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>()
  for (const t of teams) {
    map.set(t.id, { team: t, tie_wins: 0, tie_losses: 0, rubber_wins: 0, rubber_losses: 0, rank: 0 })
  }

  for (const tie of ties) {
    if (tie.status !== '終了' || !tie.winner_team_id) continue
    const s1 = map.get(tie.team1_id!)
    const s2 = map.get(tie.team2_id!)
    if (!s1 || !s2) continue

    s1.rubber_wins += tie.team1_rubbers
    s1.rubber_losses += tie.team2_rubbers
    s2.rubber_wins += tie.team2_rubbers
    s2.rubber_losses += tie.team1_rubbers

    if (tie.winner_team_id === tie.team1_id) {
      s1.tie_wins++
      s2.tie_losses++
    } else {
      s2.tie_wins++
      s1.tie_losses++
    }
  }

  const list = Array.from(map.values())
  list.sort((a, b) => {
    if (b.tie_wins !== a.tie_wins) return b.tie_wins - a.tie_wins
    if (b.rubber_wins !== a.rubber_wins) return b.rubber_wins - a.rubber_wins
    const direct = getDirectTie(a.team.id, b.team.id, ties)
    return direct
  })

  let rank = 1
  for (let i = 0; i < list.length; i++) {
    if (i > 0) {
      const prev = list[i - 1]
      const cur = list[i]
      if (prev.tie_wins === cur.tie_wins && prev.rubber_wins === cur.rubber_wins) {
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

function getDirectTie(a: string, b: string, ties: Tie[]): number {
  for (const t of ties) {
    if (t.status !== '終了') continue
    if (t.team1_id === a && t.team2_id === b) return t.winner_team_id === a ? -1 : 1
    if (t.team1_id === b && t.team2_id === a) return t.winner_team_id === b ? 1 : -1
  }
  return 0
}
