'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Block, Entry, Team } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/ui/Skeleton'

interface EditingEntry extends Entry { _editing?: boolean }

export default function BlocksPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCatId, setSelectedCatId] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  // 個人戦
  const [entries, setEntries] = useState<EditingEntry[]>([])
  // 団体戦
  const [teams, setTeams] = useState<Team[]>([])

  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editClub, setEditClub] = useState('')
  const [editPlayer2, setEditPlayer2] = useState('')
  const [editMembers, setEditMembers] = useState('')
  const [showCsv, setShowCsv] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvBlockId, setCsvBlockId] = useState('')
  const [newBlockName, setNewBlockName] = useState('')
  const [hasMatches, setHasMatches] = useState(false)
  const { showToast, ToastContainer } = useToast()

  const selectedCat = categories.find(c => c.id === selectedCatId)
  const isTeamCat = selectedCat?.type === 'team'

  const loadCategories = useCallback(async () => {
    const supabase = createClient()
    const { data: t } = await supabase.from('tournaments').select('id').order('created_at', { ascending: false }).limit(1)
    const tourId = t?.[0]?.id
    if (!tourId) { setLoading(false); return }
    const { data: cats } = await supabase.from('categories').select('*').eq('tournament_id', tourId).order('sort_order')
    setCategories(cats ?? [])
    if (cats && cats.length > 0) setSelectedCatId(cats[0].id)
    setLoading(false)
  }, [])

  const loadData = useCallback(async (catId: string) => {
    if (!catId) return
    const supabase = createClient()
    const { data: blks } = await supabase.from('blocks').select('*').eq('category_id', catId).order('name')
    setBlocks(blks ?? [])
    const blockIds = (blks ?? []).map(b => b.id)
    if (blockIds.length === 0) { setEntries([]); setTeams([]); setHasMatches(false); return }

    const cat = categories.find(c => c.id === catId)
    if (cat?.type === 'team') {
      const { data: tms } = await supabase.from('teams').select('*').in('block_id', blockIds).order('sort_order')
      setTeams(tms ?? [])
      setEntries([])
    } else {
      const { data: ents } = await supabase.from('entries').select('*').in('block_id', blockIds).order('sort_order')
      setEntries(ents ?? [])
      setTeams([])
      const { data: matches } = await supabase.from('matches').select('id').in('block_id', blockIds).limit(1)
      setHasMatches((matches?.length ?? 0) > 0)
    }
  }, [categories])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { if (selectedCatId) loadData(selectedCatId) }, [selectedCatId, loadData])

  // ── ブロック操作 ──
  async function addBlock() {
    const name = newBlockName.trim() || `${String.fromCharCode(65 + blocks.length)}ブロック`
    const supabase = createClient()
    const { data } = await supabase.from('blocks').insert({ category_id: selectedCatId, name, block_type: 'league' }).select().single()
    if (data) { setBlocks(p => [...p, data]); setNewBlockName('') }
  }

  async function deleteBlock(blockId: string) {
    if (!confirm('このブロックと全データを削除しますか？')) return
    const supabase = createClient()
    await supabase.from('blocks').delete().eq('id', blockId)
    setBlocks(p => p.filter(b => b.id !== blockId))
    setEntries(p => p.filter(e => e.block_id !== blockId))
    setTeams(p => p.filter(t => t.block_id !== blockId))
  }

  async function renameBlock(blockId: string, name: string) {
    const supabase = createClient()
    await supabase.from('blocks').update({ name }).eq('id', blockId)
    setBlocks(p => p.map(b => b.id === blockId ? { ...b, name } : b))
  }

  // ── 個人戦 エントリー操作 ──
  function startEditEntry(entry: Entry) {
    setEditId(entry.id)
    setEditName(entry.name)
    setEditClub(entry.club ?? '')
    setEditPlayer2(entry.player2 ?? '')
  }

  async function saveEditEntry(entry: Entry) {
    const supabase = createClient()
    await supabase.from('entries').update({ name: editName, club: editClub || null, player2: editPlayer2 || null }).eq('id', entry.id)
    setEntries(p => p.map(e => e.id === entry.id ? { ...e, name: editName, club: editClub || null, player2: editPlayer2 || null } : e))
    setEditId(null)
    showToast('保存しました')
  }

  async function moveEntry(entryId: string, newBlockId: string) {
    const supabase = createClient()
    await supabase.from('entries').update({ block_id: newBlockId }).eq('id', entryId)
    setEntries(p => p.map(e => e.id === entryId ? { ...e, block_id: newBlockId } : e))
    if (hasMatches) showToast('対戦表の再生成が必要です', 'info')
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('この参加者を削除しますか？')) return
    const supabase = createClient()
    await supabase.from('entries').delete().eq('id', entryId)
    setEntries(p => p.filter(e => e.id !== entryId))
  }

  async function addEntry(blockId: string) {
    const name = prompt('参加者名を入力')
    if (!name?.trim()) return
    const club = prompt('所属クラブ（省略可）') ?? ''
    const supabase = createClient()
    const blockEntries = entries.filter(e => e.block_id === blockId)
    const { data } = await supabase.from('entries').insert({ block_id: blockId, name: name.trim(), club: club || null, sort_order: blockEntries.length }).select().single()
    if (data) setEntries(p => [...p, data])
    showToast('追加しました')
  }

  // ── 団体戦 チーム操作 ──
  function startEditTeam(team: Team) {
    setEditId(team.id)
    setEditName(team.name)
    setEditClub(team.club ?? '')
    setEditMembers(team.members ?? '')
  }

  async function saveEditTeam(team: Team) {
    const supabase = createClient()
    await supabase.from('teams').update({ name: editName, club: editClub || null, members: editMembers || null }).eq('id', team.id)
    setTeams(p => p.map(t => t.id === team.id ? { ...t, name: editName, club: editClub || null, members: editMembers || null } : t))
    setEditId(null)
    showToast('保存しました')
  }

  async function moveTeam(teamId: string, newBlockId: string) {
    const supabase = createClient()
    await supabase.from('teams').update({ block_id: newBlockId }).eq('id', teamId)
    setTeams(p => p.map(t => t.id === teamId ? { ...t, block_id: newBlockId } : t))
  }

  async function deleteTeam(teamId: string) {
    if (!confirm('このチームを削除しますか？')) return
    const supabase = createClient()
    await supabase.from('teams').delete().eq('id', teamId)
    setTeams(p => p.filter(t => t.id !== teamId))
  }

  async function addTeam(blockId: string) {
    const name = prompt('チーム名を入力')
    if (!name?.trim()) return
    const club = prompt('所属クラブ（省略可）') ?? ''
    const supabase = createClient()
    const blockTeams = teams.filter(t => t.block_id === blockId)
    const { data } = await supabase.from('teams').insert({ block_id: blockId, name: name.trim(), club: club || null, sort_order: blockTeams.length }).select().single()
    if (data) setTeams(p => [...p, data])
    showToast('チームを追加しました')
  }

  // ── CSVインポート（個人戦用） ──
  async function importCsv() {
    if (!csvBlockId || !csvText.trim()) { showToast('ブロックとデータを入力してください', 'error'); return }
    const supabase = createClient()
    const lines = csvText.split('\n').filter(l => l.trim())
    const cat = categories.find(c => c.id === selectedCatId)
    const isDoubles = cat?.format === 'doubles'

    const insertData = lines.map((line, i) => {
      const parts = line.split(/[,\t]/).map(s => s.trim())
      return {
        block_id: csvBlockId,
        name: parts[0],
        club: parts[1] || null,
        player2: isDoubles ? (parts[2] || null) : null,
        sort_order: (entries.filter(e => e.block_id === csvBlockId).length) + i,
      }
    })
    const { error } = await supabase.from('entries').insert(insertData)
    if (error) { showToast('インポートエラー: ' + error.message, 'error'); return }
    await loadData(selectedCatId)
    setCsvText(''); setShowCsv(false)
    showToast(`${insertData.length}件インポートしました`)
  }

  // ── CSVインポート（団体戦チーム用） ──
  async function importTeamCsv() {
    if (!csvBlockId || !csvText.trim()) { showToast('ブロックとデータを入力してください', 'error'); return }
    const supabase = createClient()
    const lines = csvText.split('\n').filter(l => l.trim())
    const insertData = lines.map((line, i) => {
      const parts = line.split(/[,\t]/).map(s => s.trim())
      return {
        block_id: csvBlockId,
        name: parts[0],
        club: parts[1] || null,
        sort_order: (teams.filter(t => t.block_id === csvBlockId).length) + i,
      }
    })
    const { error } = await supabase.from('teams').insert(insertData)
    if (error) { showToast('インポートエラー: ' + error.message, 'error'); return }
    await loadData(selectedCatId)
    setCsvText(''); setShowCsv(false)
    showToast(`${insertData.length}チームインポートしました`)
  }

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>

  return (
    <div className="space-y-5 pb-10">
      <ToastContainer />
      <h1 className="text-xl font-bold">👥 ブロック管理</h1>

      {hasMatches && !isTeamCat && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-3 text-sm text-yellow-800">
          ⚠️ 既に対戦表が生成されています。参加者を変更した場合は「組み合わせ」ページで再生成してください。
        </div>
      )}

      {/* 種目タブ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCatId(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${selectedCatId === cat.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
            {cat.name}
            <span className="ml-1 text-xs font-normal opacity-70">
              {cat.type === 'team' ? '団体' : '個人'}
            </span>
          </button>
        ))}
      </div>

      {/* 種目タイプ表示 */}
      {selectedCat && (
        <div className="text-xs text-gray-500 -mt-2">
          {isTeamCat ? '🏆 団体戦 — チームを登録してください' : '🏸 個人戦 — 参加者を登録してください'}
        </div>
      )}

      {/* ブロック追加 */}
      <div className="flex gap-2">
        <input value={newBlockName} onChange={e => setNewBlockName(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
          placeholder="ブロック名（例: Aブロック）" />
        <button onClick={addBlock} className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-bold">＋追加</button>
      </div>

      {/* ブロック一覧 */}
      {blocks.map(block => {
        const blockEntries = entries.filter(e => e.block_id === block.id)
        const blockTeams = teams.filter(t => t.block_id === block.id)

        return (
          <div key={block.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* ブロックヘッダー */}
            <div className="bg-primary text-white px-4 py-3 flex items-center gap-2">
              <input
                defaultValue={block.name}
                onBlur={e => { if (e.target.value !== block.name) renameBlock(block.id, e.target.value) }}
                className="font-bold bg-transparent border-b border-white/40 focus:outline-none focus:border-white flex-1"
              />
              <span className="text-white/70 text-sm">
                {isTeamCat ? `${blockTeams.length}チーム` : `${blockEntries.length}名`}
              </span>
              <button onClick={() => deleteBlock(block.id)} className="text-white/60 hover:text-white text-xs ml-2">削除</button>
            </div>

            {/* ────── 団体戦: チーム一覧 ────── */}
            {isTeamCat ? (
              <div className="divide-y divide-gray-100">
                {blockTeams.map((team, idx) => (
                  <div key={team.id} className="px-4 py-3">
                    {editId === team.id ? (
                      <div className="space-y-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="w-full border border-primary rounded-xl px-3 py-2 font-bold focus:outline-none" placeholder="チーム名" />
                        <input value={editClub} onChange={e => setEditClub(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="所属クラブ" />
                        <textarea
                          value={editMembers}
                          onChange={e => setEditMembers(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none h-24"
                          placeholder="メンバー（1行に1名）&#10;例:&#10;山田太郎&#10;鈴木花子&#10;田中次郎"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEditTeam(team)} className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold">保存</button>
                          <button onClick={() => setEditId(null)} className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2 text-sm">キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 text-sm w-5 mt-0.5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{team.name}</div>
                          {team.club && <div className="text-xs text-gray-400">{team.club}</div>}
                          {team.members && (
                            <div className="mt-1 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1">
                              {team.members.split(/[\n,、]/).filter(Boolean).map((m, i) => (
                                <span key={i} className="mr-2">・{m.trim()}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <select
                          value={team.block_id}
                          onChange={e => moveTeam(team.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                        >
                          {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button onClick={() => startEditTeam(team)} className="text-primary text-xs px-2 py-1 border border-primary/30 rounded-lg">編集</button>
                        <button onClick={() => deleteTeam(team.id)} className="text-red-400 text-xs px-2 py-1">削除</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="px-4 py-2">
                  <button onClick={() => addTeam(block.id)} className="text-primary text-sm font-medium">＋ チームを追加</button>
                </div>
              </div>
            ) : (
              // ────── 個人戦: エントリー一覧 ──────
              <div className="divide-y divide-gray-100">
                {blockEntries.map((entry, idx) => (
                  <div key={entry.id} className="px-4 py-3">
                    {editId === entry.id ? (
                      <div className="space-y-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="w-full border border-primary rounded-xl px-3 py-2 font-bold focus:outline-none" placeholder="名前" />
                        {selectedCat?.format === 'doubles' && (
                          <input value={editPlayer2} onChange={e => setEditPlayer2(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" placeholder="ペア名（ダブルス2人目）" />
                        )}
                        <input value={editClub} onChange={e => setEditClub(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="所属クラブ" />
                        <div className="flex gap-2">
                          <button onClick={() => saveEditEntry(entry)} className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold">保存</button>
                          <button onClick={() => setEditId(null)} className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2 text-sm">キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm w-5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {entry.name}{entry.player2 ? ` / ${entry.player2}` : ''}
                          </div>
                          {entry.club && <div className="text-xs text-gray-400">{entry.club}</div>}
                        </div>
                        <select
                          value={entry.block_id}
                          onChange={e => moveEntry(entry.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                        >
                          {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button onClick={() => startEditEntry(entry)} className="text-primary text-xs px-2 py-1 border border-primary/30 rounded-lg">編集</button>
                        <button onClick={() => deleteEntry(entry.id)} className="text-red-400 text-xs px-2 py-1">削除</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="px-4 py-2">
                  <button onClick={() => addEntry(block.id)} className="text-primary text-sm font-medium">＋ 参加者を追加</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {blocks.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">📋</div>
          <div>ブロックがありません。「＋追加」でブロックを作成してください。</div>
        </div>
      )}

      {/* CSVインポート */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <button onClick={() => setShowCsv(v => !v)} className="font-bold text-sm text-primary">
          {showCsv ? '▲' : '▼'} CSVインポート（一括追加）
        </button>
        {showCsv && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-500">
              {isTeamCat
                ? '形式: チーム名（,所属クラブ）'
                : 'スプレッドシートからコピー＆ペースト可。\n形式: 名前（,所属クラブ）（,ペア名[ダブルスのみ]）'
              }
            </p>
            <select value={csvBlockId} onChange={e => setCsvBlockId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">追加先ブロックを選択</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 h-36 font-mono text-sm focus:outline-none focus:border-primary"
              placeholder={isTeamCat ? '倉敷クラブ\n岡山クラブ\n玉野クラブ' : '山田太郎,倉敷クラブ\n鈴木花子,岡山クラブ\n田中次郎'} />
            <button
              onClick={isTeamCat ? importTeamCsv : importCsv}
              className="w-full bg-done text-white rounded-xl py-3 font-bold">
              インポート実行
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
