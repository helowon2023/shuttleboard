'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, Block, Entry } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/ui/Skeleton'

interface EditingEntry extends Entry { _editing?: boolean }

export default function BlocksPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCatId, setSelectedCatId] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [entries, setEntries] = useState<EditingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editClub, setEditClub] = useState('')
  const [editPlayer2, setEditPlayer2] = useState('')
  const [showCsv, setShowCsv] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvBlockId, setCsvBlockId] = useState('')
  const [newBlockName, setNewBlockName] = useState('')
  const [hasMatches, setHasMatches] = useState(false)
  const { showToast, ToastContainer } = useToast()

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

  const loadBlocksAndEntries = useCallback(async (catId: string) => {
    if (!catId) return
    const supabase = createClient()
    const { data: blks } = await supabase.from('blocks').select('*').eq('category_id', catId).order('name')
    setBlocks(blks ?? [])
    const blockIds = (blks ?? []).map(b => b.id)
    if (blockIds.length > 0) {
      const { data: ents } = await supabase.from('entries').select('*').in('block_id', blockIds).order('sort_order')
      setEntries(ents ?? [])
      const { data: matches } = await supabase.from('matches').select('id').in('block_id', blockIds).limit(1)
      setHasMatches((matches?.length ?? 0) > 0)
    } else {
      setEntries([])
      setHasMatches(false)
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { if (selectedCatId) loadBlocksAndEntries(selectedCatId) }, [selectedCatId, loadBlocksAndEntries])

  // ── ブロック操作 ──
  async function addBlock() {
    const name = newBlockName.trim() || `${String.fromCharCode(65 + blocks.length)}ブロック`
    const supabase = createClient()
    const { data } = await supabase.from('blocks').insert({ category_id: selectedCatId, name, block_type: 'league' }).select().single()
    if (data) { setBlocks(p => [...p, data]); setNewBlockName('') }
  }

  async function deleteBlock(blockId: string) {
    if (!confirm('このブロックと参加者を全て削除しますか？')) return
    const supabase = createClient()
    await supabase.from('blocks').delete().eq('id', blockId)
    setBlocks(p => p.filter(b => b.id !== blockId))
    setEntries(p => p.filter(e => e.block_id !== blockId))
  }

  async function renameBlock(blockId: string, name: string) {
    const supabase = createClient()
    await supabase.from('blocks').update({ name }).eq('id', blockId)
    setBlocks(p => p.map(b => b.id === blockId ? { ...b, name } : b))
  }

  // ── エントリー操作 ──
  function startEdit(entry: Entry) {
    setEditId(entry.id)
    setEditName(entry.name)
    setEditClub(entry.club ?? '')
    setEditPlayer2(entry.player2 ?? '')
  }

  async function saveEdit(entry: Entry) {
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

  // ── CSVインポート ──
  async function importCsv() {
    if (!csvBlockId || !csvText.trim()) { showToast('ブロックとデータを入力してください', 'error'); return }
    const supabase = createClient()
    const lines = csvText.split('\n').filter(l => l.trim())
    const cat = categories.find(c => c.id === selectedCatId)
    const isDoubles = cat?.format === 'doubles'

    const insertData = lines.map((line, i) => {
      const parts = line.split(/[,\t]/).map(s => s.trim())
      // 形式: 名前[,所属][,ペア名(ダブルスのみ)]
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
    await loadBlocksAndEntries(selectedCatId)
    setCsvText(''); setShowCsv(false)
    showToast(`${insertData.length}件インポートしました`)
  }

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>

  return (
    <div className="space-y-5 pb-10">
      <ToastContainer />
      <h1 className="text-xl font-bold">👥 ブロック管理</h1>

      {hasMatches && (
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
          </button>
        ))}
      </div>

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
        return (
          <div key={block.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* ブロックヘッダー */}
            <div className="bg-primary text-white px-4 py-3 flex items-center gap-2">
              <input
                defaultValue={block.name}
                onBlur={e => { if (e.target.value !== block.name) renameBlock(block.id, e.target.value) }}
                className="font-bold bg-transparent border-b border-white/40 focus:outline-none focus:border-white flex-1"
              />
              <span className="text-white/70 text-sm">{blockEntries.length}名</span>
              <button onClick={() => deleteBlock(block.id)} className="text-white/60 hover:text-white text-xs ml-2">削除</button>
            </div>

            {/* エントリー一覧 */}
            <div className="divide-y divide-gray-100">
              {blockEntries.map((entry, idx) => (
                <div key={entry.id} className="px-4 py-3">
                  {editId === entry.id ? (
                    /* 編集モード */
                    <div className="space-y-2">
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="w-full border border-primary rounded-xl px-3 py-2 font-bold focus:outline-none" placeholder="名前" />
                      {categories.find(c => c.id === selectedCatId)?.format === 'doubles' && (
                        <input value={editPlayer2} onChange={e => setEditPlayer2(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" placeholder="ペア名（ダブルス2人目）" />
                      )}
                      <input value={editClub} onChange={e => setEditClub(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" placeholder="所属クラブ" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(entry)} className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold">保存</button>
                        <button onClick={() => setEditId(null)} className="bg-gray-100 text-gray-600 rounded-xl px-4 py-2 text-sm">キャンセル</button>
                      </div>
                    </div>
                  ) : (
                    /* 表示モード */
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-5">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {entry.name}{entry.player2 ? ` / ${entry.player2}` : ''}
                        </div>
                        {entry.club && <div className="text-xs text-gray-400">{entry.club}</div>}
                      </div>
                      {/* ブロック移動 */}
                      <select
                        value={entry.block_id}
                        onChange={e => moveEntry(entry.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                      >
                        {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button onClick={() => startEdit(entry)} className="text-primary text-xs px-2 py-1 border border-primary/30 rounded-lg">編集</button>
                      <button onClick={() => deleteEntry(entry.id)} className="text-red-400 text-xs px-2 py-1">削除</button>
                    </div>
                  )}
                </div>
              ))}

              {/* エントリー追加ボタン */}
              <div className="px-4 py-2">
                <button onClick={() => addEntry(block.id)} className="text-primary text-sm font-medium">＋ 参加者を追加</button>
              </div>
            </div>
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
              スプレッドシートからコピー＆ペースト可。<br />
              形式: 名前（,所属クラブ）（,ペア名[ダブルスのみ]）
            </p>
            <select value={csvBlockId} onChange={e => setCsvBlockId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">追加先ブロックを選択</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 h-36 font-mono text-sm focus:outline-none focus:border-primary"
              placeholder={'山田太郎,倉敷クラブ\n鈴木花子,岡山クラブ\n田中次郎'} />
            <button onClick={importCsv} className="w-full bg-done text-white rounded-xl py-3 font-bold">
              インポート実行
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
