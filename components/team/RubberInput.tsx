'use client'
import { useState } from 'react'
import type { Rubber, Team } from '@/lib/types'

interface RubberInputProps {
  rubber: Rubber
  team1?: Team
  team2?: Team
  onSubmit: (data: Partial<Rubber>) => Promise<void>
}

export function RubberInput({ rubber, team1, team2, onSubmit }: RubberInputProps) {
  const [team1_p1, setT1P1] = useState(rubber.team1_p1 ?? '')
  const [team1_p2, setT1P2] = useState(rubber.team1_p2 ?? '')
  const [team2_p1, setT2P1] = useState(rubber.team2_p1 ?? '')
  const [team2_p2, setT2P2] = useState(rubber.team2_p2 ?? '')
  const [score1, setScore1] = useState(rubber.score1?.toString() ?? '')
  const [score2, setScore2] = useState(rubber.score2?.toString() ?? '')
  const [court, setCourt] = useState(rubber.court ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isDoubles = rubber.rubber_type === 'doubles'

  async function handleSubmit() {
    const s1 = parseInt(score1)
    const s2 = parseInt(score2)
    if (isNaN(s1) || isNaN(s2)) { setError('スコアを入力してください'); return }
    if (s1 === s2) { setError('同点はありません'); return }
    const winner_team_id = s1 > s2 ? team1?.id ?? null : team2?.id ?? null
    setLoading(true)
    setError('')
    await onSubmit({
      team1_p1: team1_p1 || null,
      team1_p2: isDoubles ? (team1_p2 || null) : null,
      team2_p1: team2_p1 || null,
      team2_p2: isDoubles ? (team2_p2 || null) : null,
      score1: s1,
      score2: s2,
      winner_team_id,
      court: court || null,
      status: '終了' as const,
    })
    setLoading(false)
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
      <div className="font-bold text-sm text-primary">{rubber.label}</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">{team1?.name}</div>
          <input className="w-full border rounded-xl px-3 py-2 text-sm" value={team1_p1} onChange={e => setT1P1(e.target.value)} placeholder="選手1" />
          {isDoubles && <input className="w-full border rounded-xl px-3 py-2 text-sm mt-1" value={team1_p2} onChange={e => setT1P2(e.target.value)} placeholder="選手2" />}
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">{team2?.name}</div>
          <input className="w-full border rounded-xl px-3 py-2 text-sm" value={team2_p1} onChange={e => setT2P1(e.target.value)} placeholder="選手1" />
          {isDoubles && <input className="w-full border rounded-xl px-3 py-2 text-sm mt-1" value={team2_p2} onChange={e => setT2P2(e.target.value)} placeholder="選手2" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <input type="number" inputMode="numeric" value={score1} onChange={e => setScore1(e.target.value)} className="score-input border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none w-full" placeholder="0" />
        <div className="text-center text-gray-400 font-bold">-</div>
        <input type="number" inputMode="numeric" value={score2} onChange={e => setScore2(e.target.value)} className="score-input border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none w-full" placeholder="0" />
      </div>

      {error && <div className="text-in-progress text-sm text-center">{error}</div>}

      <button onClick={handleSubmit} disabled={loading} className="w-full bg-primary text-white rounded-xl py-3 font-bold disabled:opacity-50">
        {loading ? '保存中...' : rubber.status === '終了' ? '修正して確定' : '確定'}
      </button>
    </div>
  )
}
