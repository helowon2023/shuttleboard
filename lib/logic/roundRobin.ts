export interface MatchSeed {
  entry1_index: number
  entry2_index: number
  match_order: number
}

export interface EntryWithClub {
  index: number
  club: string | null
}

// 同クラブが隣り合わないよう参加者を並び替える
function spreadByClub(entries: EntryWithClub[]): EntryWithClub[] {
  // クラブごとにグループ化
  const clubMap = new Map<string, EntryWithClub[]>()
  for (const e of entries) {
    const key = e.club ?? `__no_club_${e.index}`
    if (!clubMap.has(key)) clubMap.set(key, [])
    clubMap.get(key)!.push(e)
  }
  // 人数の多いクラブ順にソート
  const groups = Array.from(clubMap.values()).sort((a, b) => b.length - a.length)

  // ラウンドロビン式に各グループから1人ずつ取り出して並べる
  const result: EntryWithClub[] = []
  let hasMore = true
  while (hasMore) {
    hasMore = false
    for (const group of groups) {
      if (group.length > 0) {
        result.push(group.shift()!)
        hasMore = true
      }
    }
  }
  return result
}

export function generateRoundRobin(count: number): MatchSeed[] {
  const indices = Array.from({ length: count }, (_, i) => i)
  return generateRoundRobinFromIndices(indices)
}

// クラブ情報を使って同クラブ対戦を最小化した総当たりを生成
export function generateRoundRobinWithClubs(entries: EntryWithClub[]): MatchSeed[] {
  const sorted = spreadByClub(entries)
  const indices = sorted.map(e => e.index)
  return generateRoundRobinFromIndices(indices)
}

function generateRoundRobinFromIndices(indices: number[]): MatchSeed[] {
  const count = indices.length
  const n = count % 2 === 0 ? count : count + 1
  const players = Array.from({ length: n }, (_, i) => i)
  const rounds: MatchSeed[] = []
  let order = 0

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = players[i]
      const b = players[n - 1 - i]
      if (a < count && b < count) {
        rounds.push({
          entry1_index: indices[a],
          entry2_index: indices[b],
          match_order: order++,
        })
      }
    }
    const last = players[n - 1]
    for (let i = n - 1; i > 1; i--) players[i] = players[i - 1]
    players[1] = last
  }

  return rounds
}
