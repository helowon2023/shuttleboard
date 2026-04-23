'use client'
import { useState } from 'react'
import type { Match, Entry } from '@/lib/types'

export interface GameScoreExtras {
  score1_g2?: number
  score2_g2?: number
  score1_g3?: number
  score2_g3?: number
}

interface ScoreInputProps {
  match: Match
  entry1?: Entry
  entry2?: Entry
  maxSets?: number  // 1 or 3 (default: 1)
  onSubmit: (score1: number, score2: number, court: string, extras?: GameScoreExtras) => Promise<void>
  onCancel: () => void
}

interface GameState { s1: string; s2: string }

function gameWinner(g: GameState): 1 | 2 | null {
  const s1 = parseInt(g.s1), s2 = parseInt(g.s2)
  if (isNaN(s1) || isNaN(s2) || s1 === s2) return null
  return s1 > s2 ? 1 : 2
}

export function ScoreInput({ match, entry1, entry2, maxSets = 1, onSubmit, onCancel }: ScoreInputProps) {
  const [g1, setG1] = useState<GameState>({
    s1: match.score1?.toString() ?? '',
    s2: match.score2?.toString() ?? '',
  })
  const [g2, setG2] = useState<GameState>({
    s1: match.score1_g2?.toString() ?? '',
    s2: match.score2_g2?.toString() ?? '',
  })
  const [g3, setG3] = useState<GameState>({
    s1: match.score1_g3?.toString() ?? '',
    s2: match.score2_g3?.toString() ?? '',
  })
  const [court, setCourt] = useState(match.court ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const is3set = maxSets >= 3

  // ゲーム勝者
  const w1 = gameWinner(g1)
  const w2 = gameWinner(g2)
  const w3 = gameWinner(g3)

  // 現在の勝数
  const wins1 = [w1, w2, w3].filter(w => w === 1).length
  const wins2 = [w1, w2, w3].filter(w => w === 2).length

  // 第3ゲームが必要か（1-1のとき）
  const needGame3 = is3set && w1 !== null && w2 !== null && w1 !== w2

  async function handleSubmit() {
    const s1 = parseInt(g1.s1), s2 = parseInt(g1.s2)

    if (isNaN(s1) || isNaN(s2)) {
      setError(is3set ? '第1ゲームのスコアを入力してください' : 'スコアを入力してください')
      return
    }

    if (is3set) {
      const g2s1 = parseInt(g2.s1), g2s2 = parseInt(g2.s2)
      if (isNaN(g2s1) || isNaN(g2s2)) { setError('第2ゲームのスコアを入力してください'); return }
      if (w1 === null) { setError('第1ゲームのスコアが不正です（同点不可）'); return }
      if (w2 === null) { setError('第2ゲームのスコアが不正です（同点不可）'); return }

      if (needGame3) {
        const g3s1 = parseInt(g3.s1), g3s2 = parseInt(g3.s2)
        if (isNaN(g3s1) || isNaN(g3s2)) { setError('第3ゲーム（ファイナル）のスコアを入力してください'); return }
        if (w3 === null) { setError('第3ゲームのスコアが不正です（同点不可）'); return }
      }

      const totalWins1 = wins1 + (needGame3 && w3 === 1 ? 0 : 0) // already counted
      const totalWins2 = wins2

      if (totalWins1 < 2 && totalWins2 < 2) {
        setError('2ゲーム先取で勝者を決定してください')
        return
      }

      setLoading(true)
      setError('')

      // score1/score2 = ゲーム1の点数, extras = ゲーム2/3の点数
      const extras: GameScoreExtras = {
        score1_g2: parseInt(g2.s1) || undefined,
        score2_g2: parseInt(g2.s2) || undefined,
        score1_g3: needGame3 ? (parseInt(g3.s1) || undefined) : undefined,
        score2_g3: needGame3 ? (parseInt(g3.s2) || undefined) : undefined,
      }
      await onSubmit(s1, s2, court, extras)
      setLoading(false)
    } else {
      if (s1 === s2) { setError('同点はありません'); return }
      setLoading(true)
      setError('')
      await onSubmit(s1, s2, court)
      setLoading(false)
    }
  }

  const courts = ['1', '2', '3', '4', '5', '6']

  return (
    <div className="space-y-5">
      {is3set ? (
        // 3セットモード
        <div className="space-y-4">
          {/* ゲーム1 */}
          <GameScoreRow
            label="第1ゲーム（21点）"
            g={g1} setG={setG1}
            name1={entry1?.name ?? 'TBD'}
            name2={entry2?.name ?? 'TBD'}
            winner={w1}
          />
          {/* ゲーム2 */}
          <GameScoreRow
            label="第2ゲーム（21点）"
            g={g2} setG={setG2}
            name1={entry1?.name ?? 'TBD'}
            name2={entry2?.name ?? 'TBD'}
            winner={w2}
          />
          {/* ゲーム3（必要な場合のみ） */}
          {needGame3 && (
            <GameScoreRow
              label="第3ゲーム・ファイナル（11点）"
              g={g3} setG={setG3}
              name1={entry1?.name ?? 'TBD'}
              name2={entry2?.name ?? 'TBD'}
              winner={w3}
              final
            />
          )}
          {/* 勝利状況 */}
          {(w1 !== null || w2 !== null) && (
            <div className="text-center text-sm font-bold text-gray-600 bg-gray-50 rounded-xl py-2">
              ゲーム数：{entry1?.name ?? '①'} {wins1} — {wins2} {entry2?.name ?? '②'}
              {(wins1 >= 2 || wins2 >= 2) && (
                <span className="ml-2 text-primary">
                  🏆 {wins1 >= 2 ? (entry1?.name ?? '①') : (entry2?.name ?? '②')} 勝利
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        // 1セットモード（従来）
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="font-bold text-sm mb-2">{entry1?.name ?? 'TBD'}</div>
            <input
              type="number"
              inputMode="numeric"
              value={g1.s1}
              onChange={e => setG1({ ...g1, s1: e.target.value })}
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
              value={g1.s2}
              onChange={e => setG1({ ...g1, s2: e.target.value })}
              className="score-input w-full border-2 border-gray-200 rounded-2xl focus:border-primary focus:outline-none"
              placeholder="0"
              min={0}
              max={99}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm text-center">{error}</div>
      )}

      {/* コート選択 */}
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

// ゲームスコア入力行
function GameScoreRow({
  label, g, setG, name1, name2, winner, final = false,
}: {
  label: string
  g: GameState
  setG: (g: GameState) => void
  name1: string
  name2: string
  winner: 1 | 2 | null
  final?: boolean
}) {
  const maxPts = final ? 11 : 21
  return (
    <div className="border border-gray-200 rounded-xl p-3">
      <div className="text-xs font-bold text-gray-500 mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-3 items-center">
        <div className="text-center">
          <div className={`text-xs font-medium mb-1 truncate ${winner === 1 ? 'text-primary font-bold' : 'text-gray-600'}`}>
            {winner === 1 && '🏆 '}{name1}
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={g.s1}
            onChange={e => setG({ ...g, s1: e.target.value })}
            className={`w-full text-center text-2xl font-bold border-2 rounded-2xl py-2 focus:outline-none transition-colors ${
              winner === 1 ? 'border-primary bg-primary/5' : 'border-gray-200 focus:border-primary'
            }`}
            placeholder="0"
            min={0}
            max={maxPts + 10}
          />
        </div>
        <div className="text-center text-xl font-bold text-gray-300">—</div>
        <div className="text-center">
          <div className={`text-xs font-medium mb-1 truncate ${winner === 2 ? 'text-primary font-bold' : 'text-gray-600'}`}>
            {winner === 2 && '🏆 '}{name2}
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={g.s2}
            onChange={e => setG({ ...g, s2: e.target.value })}
            className={`w-full text-center text-2xl font-bold border-2 rounded-2xl py-2 focus:outline-none transition-colors ${
              winner === 2 ? 'border-primary bg-primary/5' : 'border-gray-200 focus:border-primary'
            }`}
            placeholder="0"
            min={0}
            max={maxPts + 10}
          />
        </div>
      </div>
    </div>
  )
}
