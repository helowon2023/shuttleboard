'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import type { Match, Entry, Block, Category, Tournament } from '@/lib/types'

interface BlockWithMatches {
  block: Block
  category: Category
  entries: Entry[]
  matches: Match[]
}

export default function DrawPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [grouped, setGrouped] = useState<BlockWithMatches[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast, ToastContainer } = useToast()

  // 試合追加フォーム状態
  const [addingBlockId, setAddingBlockId] = useState<string | null>(null)
  const [newEntry1, setNewEntry1] = useState('')
  const [newEntry2, setNewEntry2] = useState('')

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: t } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1)
      const tour = t?.[0]
      if (!tour) { setLoading(false); return }
      setTournament(tour)

      const { data: cats } = await supabase.from('categories').select('*').eq('tournament_id', tour.id).order('sort_order')
      const catIds = (cats ?? []).map(c => c.id)
      if (catIds.length === 0) { setLoading(false); return }

      const { data: blocks } = await supabase.from('blocks').select('*').in('category_id', catIds)
      const blockIds = (blocks ?? []).map(b => b.id)
      if (blockIds.length === 0) { setLoading(false); return }

      const [{ data: entries }, { data: matches }] = await Promise.all([
        supabase.from('entries').select('*').in('block_id', blockIds).order('sort_order'),
        supabase.from('matches').select('*').in('block_id', blockIds).order('match_order'),
      ])

      const catMap = new Map((cats ?? []).map(c => [c.id, c]))
      const result: BlockWithMatches[] = (blocks ?? []).map(block => ({
        block,
        category: catMap.get(block.category_id) ?? { id: '', tournament_id: '', type: 'individual', name: '不明', code: null, format: null, sort_order: 0 },
        entries: (entries ?? []).filter(e => e.block_id === block.id),
        matches: (matches ?? []).filter(m => m.block_id === block.id),
      }))

      setGrouped(result)
      setLoading(false)
    } catch (err) {
      console.error('draw load error:', err)
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // 並び替え
  function moveMatch(blockIdx: number, matchIdx: number, dir: -1 | 1) {
    const g = [...grouped]
    const bwm = { ...g[blockIdx], matches: [...g[blockIdx].matches] }
    const newIdx = matchIdx + dir
    if (newIdx < 0 || newIdx >= bwm.matches.length) return
    const tmp = bwm.matches[matchIdx]
    bwm.matches[matchIdx] = bwm.matches[newIdx]
    bwm.matches[newIdx] = tmp
    g[blockIdx] = bwm
    setGrouped(g)
  }

  // 順番保存
  async function saveOrder(blockIdx: number) {
    setSaving(true)
    const supabase = createClient()
    const bwm = grouped[blockIdx]
    await Promise.all(
      bwm.matches.map((m, i) =>
        supabase.from('matches').update({ match_order: i }).eq('id', m.id)
      )
    )
    showToast('試合順を保存しました')
    setSaving(false)
  }

  // 試合追加
  async function addMatch(blockIdx: number) {
    if (!newEntry1 || !newEntry2 || newEntry1 === newEntry2) {
      showToast('異なる選手を2名選択してください')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const bwm = grouped[blockIdx]
    const maxOrder = bwm.matches.reduce((m, x) => Math.max(m, x.match_order), -1)
    const { error } = await supabase.from('matches').insert({
      block_id: bwm.block.id,
      entry1_id: newEntry1,
      entry2_id: newEntry2,
      match_order: maxOrder + 1,
      round: 1,
      status: '未試合',
    })
    setSaving(false)
    if (error) { showToast('追加に失敗しました: ' + error.message); return }
    showToast('試合を追加しました')
    setAddingBlockId(null)
    setNewEntry1('')
    setNewEntry2('')
    load()
  }

  // 試合削除
  async function deleteMatch(matchId: string, status: string) {
    if (status === '終了' || status === '進行中') {
      showToast('進行中・終了済みの試合は削除できません')
      return
    }
    if (!confirm('この試合を削除しますか？')) return
    const supabase = createClient()
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) { showToast('削除に失敗しました: ' + error.message); return }
    showToast('試合を削除しました')
    load()
  }

  if (loading) return <div className="text-center py-12 text-gray-400">読み込み中...</div>

  if (!tournament) return (
    <div className="text-center py-12">
      <div className="text-gray-500">大会がありません</div>
      <Link href="/admin/setup" className="text-primary mt-2 block">大会を作成する</Link>
    </div>
  )

  // カテゴリでグループ化
  const catGroups = new Map<string, BlockWithMatches[]>()
  for (const bwm of grouped) {
    const key = bwm.category?.id ?? ''
    if (!catGroups.has(key)) catGroups.set(key, [])
    catGroups.get(key)!.push(bwm)
  }

  return (
    <div className="space-y-6 pb-8">
      <ToastContainer />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">🗂️ 組み合わせ管理</h1>
        {tournament.public_url && (
          <Link href={`/${tournament.public_url}`} target="_blank"
            className="text-sm text-primary border border-primary rounded-xl px-3 py-2">
            速報を見る
          </Link>
        )}
      </div>

      {Array.from(catGroups.entries()).map(([, bwms]) => {
        const cat = bwms[0]?.category
        return (
          <div key={cat?.id} className="space-y-3">
            <h2 className="font-bold text-base bg-gray-100 rounded-xl px-4 py-2">
              {cat?.name}
              <span className="ml-2 text-xs font-normal text-gray-500">
                {cat?.type === 'individual' ? '個人戦' : '団体戦'} / {cat?.format}
              </span>
            </h2>

            {bwms.map((bwm) => {
              const globalBlockIdx = grouped.indexOf(bwm)
              const isAdding = addingBlockId === bwm.block.id

              return (
                <div key={bwm.block.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold">{bwm.block.name}</div>
                    <button
                      onClick={() => saveOrder(globalBlockIdx)}
                      disabled={saving}
                      className="text-xs bg-primary text-white rounded-xl px-3 py-1.5 disabled:opacity-50"
                    >
                      順番を保存
                    </button>
                  </div>

                  {/* 参加者一覧 */}
                  {bwm.entries.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">参加者 ({bwm.entries.length}名)</div>
                      <div className="flex flex-wrap gap-2">
                        {bwm.entries.map((e, i) => (
                          <span key={e.id} className="bg-gray-100 rounded-full px-3 py-1 text-sm">
                            {i + 1}. {e.name}{e.club ? ` (${e.club})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 対戦一覧 */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      対戦順 ({bwm.matches.length}試合)　↑↓で並び替え
                    </div>
                    <div className="space-y-1">
                      {bwm.matches.length === 0 && (
                        <div className="text-center py-4 text-gray-300 text-sm">試合なし</div>
                      )}
                      {bwm.matches.map((m, matchIdx) => {
                        const e1 = bwm.entries.find(e => e.id === m.entry1_id)
                        const e2 = bwm.entries.find(e => e.id === m.entry2_id)
                        const canDelete = m.status === '未試合'
                        return (
                          <div key={m.id}
                            className="flex items-center gap-2 text-sm py-2 border-b border-gray-100 last:border-0">
                            <span className="text-gray-400 w-5 text-center shrink-0">{matchIdx + 1}</span>
                            <span className="flex-1 text-right truncate font-medium">{e1?.name ?? '-'}</span>
                            <span className="text-gray-400 shrink-0">vs</span>
                            <span className="flex-1 truncate font-medium">{e2?.name ?? '-'}</span>
                            {/* ステータスバッジ */}
                            <span className={`text-xs shrink-0 px-1.5 rounded-full ${
                              m.status === '終了' ? 'bg-green-100 text-green-700' :
                              m.status === '進行中' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {m.status}
                            </span>
                            {/* 並び替えボタン */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                onClick={() => moveMatch(globalBlockIdx, matchIdx, -1)}
                                disabled={matchIdx === 0}
                                className="text-gray-400 disabled:opacity-20 leading-none px-1 text-xs"
                              >▲</button>
                              <button
                                onClick={() => moveMatch(globalBlockIdx, matchIdx, 1)}
                                disabled={matchIdx === bwm.matches.length - 1}
                                className="text-gray-400 disabled:opacity-20 leading-none px-1 text-xs"
                              >▼</button>
                            </div>
                            {/* 削除ボタン */}
                            <button
                              onClick={() => deleteMatch(m.id, m.status)}
                              disabled={!canDelete}
                              title={canDelete ? '削除' : '進行中・終了済みは削除不可'}
                              className={`shrink-0 text-xs rounded-lg px-2 py-1 ${
                                canDelete
                                  ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                              }`}
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 試合追加フォーム（個人戦のみ） */}
                  {cat?.type === 'individual' && bwm.entries.length >= 2 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {isAdding ? (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-gray-600">試合を追加</div>
                          <div className="flex gap-2 items-center">
                            <select
                              value={newEntry1}
                              onChange={e => setNewEntry1(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-primary"
                            >
                              <option value="">選手① を選択</option>
                              {bwm.entries.map(e => (
                                <option key={e.id} value={e.id}>{e.name}{e.club ? ` (${e.club})` : ''}</option>
                              ))}
                            </select>
                            <span className="text-gray-400 text-sm shrink-0">vs</span>
                            <select
                              value={newEntry2}
                              onChange={e => setNewEntry2(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-primary"
                            >
                              <option value="">選手② を選択</option>
                              {bwm.entries
                                .filter(e => e.id !== newEntry1)
                                .map(e => (
                                  <option key={e.id} value={e.id}>{e.name}{e.club ? ` (${e.club})` : ''}</option>
                                ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setAddingBlockId(null); setNewEntry1(''); setNewEntry2('') }}
                              className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm"
                            >
                              キャンセル
                            </button>
                            <button
                              onClick={() => addMatch(globalBlockIdx)}
                              disabled={!newEntry1 || !newEntry2 || saving}
                              className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold disabled:opacity-50"
                            >
                              追加
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingBlockId(bwm.block.id); setNewEntry1(''); setNewEntry2('') }}
                          className="w-full bg-green-50 text-green-700 border border-green-200 rounded-xl py-2 text-sm font-bold hover:bg-green-100"
                        >
                          ＋ 試合を追加
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="flex gap-3 pb-6">
        <Link href="/admin/schedule" className="flex-1 bg-primary text-white rounded-xl py-4 font-bold text-center">
          進行表へ →
        </Link>
      </div>
    </div>
  )
}
