export type TournamentStatus = '準備中' | '進行中' | '終了'
export type MatchStatus = '未試合' | '呼び出し中' | '進行中' | '終了'
export type BlockType = 'league' | 'tournament'
export type CategoryType = 'individual' | 'team'
export type FormatType = 'singles' | 'doubles'
export type RubberType = 'singles' | 'doubles'

export interface Tournament {
  id: string
  name: string
  date_range: string | null
  venue: string | null
  status: TournamentStatus
  public_url: string | null
  logo_url: string | null
  created_by: string | null
  created_at: string
}

export interface Category {
  id: string
  tournament_id: string
  type: CategoryType
  name: string
  code: string | null
  format: string | null
  sort_order: number
  max_sets?: number    // 1 = 1セットマッチ, 3 = 3セットマッチ (default: 1)
}

export interface Block {
  id: string
  category_id: string
  name: string
  block_type: BlockType
  venue_area: string | null
  created_at: string
}

export interface Entry {
  id: string
  block_id: string
  name: string
  player2: string | null
  club: string | null
  seed: number | null
  sort_order: number
}

export interface Match {
  id: string
  block_id: string
  entry1_id: string | null
  entry2_id: string | null
  score1: number | null    // game 1: entry1's points (or games-won for 3-set display)
  score2: number | null    // game 1: entry2's points
  score1_g2?: number | null  // game 2: entry1's points
  score2_g2?: number | null  // game 2: entry2's points
  score1_g3?: number | null  // game 3 (final): entry1's points
  score2_g3?: number | null  // game 3 (final): entry2's points
  winner_id: string | null
  court: string | null
  round: number
  match_order: number
  status: MatchStatus
  played_at: string | null
  created_at: string
}

export interface Team {
  id: string
  block_id: string
  name: string
  club: string | null
  sort_order: number
  members?: string | null  // 改行区切りメンバー一覧
}

export interface Tie {
  id: string
  block_id: string
  team1_id: string | null
  team2_id: string | null
  winner_team_id: string | null
  team1_rubbers: number
  team2_rubbers: number
  status: MatchStatus
  match_order: number
}

export interface Rubber {
  id: string
  tie_id: string
  rubber_no: number
  rubber_type: RubberType
  label: string
  team1_p1: string | null
  team1_p2: string | null
  team2_p1: string | null
  team2_p2: string | null
  score1: number | null    // game 1: team1's points
  score2: number | null    // game 1: team2's points
  score1_g2?: number | null  // game 2: team1's points
  score2_g2?: number | null  // game 2: team2's points
  score1_g3?: number | null  // game 3: team1's points
  score2_g3?: number | null  // game 3: team2's points
  winner_team_id: string | null
  court: string | null
  status: MatchStatus
  played_at: string | null
}

export interface Standing {
  entry: Entry
  wins: number
  losses: number
  points_for: number
  points_against: number
  diff: number
  rank: number
}

export interface TeamStanding {
  team: Team
  tie_wins: number
  tie_losses: number
  rubber_wins: number
  rubber_losses: number
  rank: number
}
