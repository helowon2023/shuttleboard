'use client'
import { useState } from 'react'
import type { Match, Entry } from '@/lib/types'

interface ScoreInputProps {
  match: Match
  entry1?: Entry
  entry2?: Entry
  onSubmit: (score1: number, score2: number, court: string) => Promise<void>
  onCancel: () => void
}

export function ScoreInput({ match, entry1, entry2, onSubmit, onCancel }: ScoreInputProps) {
  const [score1, setScore1] = useState(match.score1?.toString() ?? '')
  const [score2, setScore2] = useState(match.score2?.toString() ?? '')
  const [court, setCourt] = useState(match.court ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const s1 = parseInt(score1)
    const s2 = parseInt(score2)
    if (isNaN(s1) || isNaN(s2)) { setError('スコアを入力してください'); return }
    if (s1 === s2) { setError('同点はありません'); return }
    setLoading(true)
    setError('')
    await onSubmit(s1, s2, court)
    setLoading(false)
  }

  const courts = ['1', '2', '3', '4', '5', '6']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="text-center">
          <div className="font-bold text-sm mb-2">{entry1?.name ?? 'TBD'}</div>
          <input
            type="number"
            inputMode="numeric"
            value={score1}
            onChange={e => setScore1(e.target.value)}
            className="score-input w-full border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none"
            placeholder="0"
            min={0}
            max={99}
          />
        </div>
        <div className="text-center text-2xl font-bold text-gray-300">vs</div>
        <div className="text-center">
          <div className="font-bold text-sm mb-2">{entry2?.name ?? 'TBD'}</div>
          <input
            type="number"
            inputMode="numeric"
            value={score2}
            onChange={e => setScore2(e.target.value)}
            className="score-input w-full border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none"
            placeholder="0"
            min={0}
            max={99}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-in-progress rounded-xl p-3 text-sm text-center">{error}</div>
      )}

      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">コート</div>
        <div className="flex flex-wrap gap-2">
          {courts.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCourt(c)}
              className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                court === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
          <input
            type="text"
            value={court}
            onChange={e => setCourt(e.target.value)}
            placeholder="その他"
            className="border border-gray-200 rounded-xl px-3 py-2 w-24 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-4 font-bold"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-primary text-white rounded-xl py-4 font-bold disabled:opacity-50"
        >
          {loading ? '保存中...' : '確定 ✓'}
        </button>
      </div>
    </div>
  )
}
