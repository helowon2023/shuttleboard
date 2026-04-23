import type { Rubber } from '@/lib/types'

export function resolveTie(
  rubbers: Rubber[],
  totalRubbers: number,
  team1Id: string,
  team2Id: string,
): { winnerId: string | null; team1Wins: number; team2Wins: number } {
  const majority = Math.ceil(totalRubbers / 2)
  let team1Wins = 0
  let team2Wins = 0

  for (const r of rubbers) {
    if (r.status !== '終了' || !r.winner_team_id) continue
    if (r.winner_team_id === team1Id) team1Wins++
    else if (r.winner_team_id === team2Id) team2Wins++
  }

  let winnerId: string | null = null
  if (team1Wins >= majority) winnerId = team1Id
  else if (team2Wins >= majority) winnerId = team2Id

  return { winnerId, team1Wins, team2Wins }
}
