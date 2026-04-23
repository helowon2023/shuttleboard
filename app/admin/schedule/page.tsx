'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match, Entry, Block, Category } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { SkeletonCard } from '@/components/ui/Skeleton'

type CallStatus = '未試合' | '呼び出し中' | '進行中' | '終了'

interface ScheduleMatch extends Match {
  matchNumber: number
  categoryName: string
  blockName: string
  entry1?: Entry
  entry2?: Entry
}

const STATUS_STYLES: Record<CallStatus, string> = {
  '未試合':    'bg-white border-gray-200',
  '呼び出し中': 'bg-yellow-50 border-yellow-400',
  '進行中':    'bg-red-50 border-red-400',
  '終了':      'bg-gray-100 border-gray-300 opacity-60',
}

const STATUS_BADGE: Record<CallStatus, string> = {
  '未試合':    'bg-gray-100 text-gray-500',
  '呼び出し中': 'bg-yellow-400 text-yellow-900',
  '進行中':    'bg-red-500 text-white',
  '終了':      'bg-gray-400 text-white',
}

const NEXT_STATUS: Partial<Record<CallStatus, CallStatus>> = {
  '未試合': '呼び出し中',
  // 呼び出し中→進行中ボタンは不要（スコア入力で進行中→終了）
}

const STATUS_BTN_LABEL: Partial<Record<CallStatus, string>> = {
  '未試合':  '📣 呼び出し',
  '進行中':  '結果入力→',
}

export default function SchedulePage() {
  const [matches, setMatches] = useState<ScheduleMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState<'all' | CallStatus>('all')
  const [catFilter, setCatFilter] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const { showToast, ToastContainer } = useToast()

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: t, error: tErr } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1)
      if (tErr) throw tErr
      const tour = t?.[0]
      if (!tour) { setLoading(false); return }

      const { data: cats, error: catErr } = await supabase.from('categories').select('*').eq('tournament_id', tour.id).order('sort_order')
      if (catErr) throw catErr
      setCategories(cats ?? [])

      const catIds = (cats ?? []).map(c => c.id)
      if (catIds.length === 0) { setMatches([]); setLoading(false); return }

      const { data: blocks, error: blkErr } = await supabase.from('blocks').select('*').in('category_id', catIds)
      if (blkErr) throw blkErr
      const blockIds = (blocks ?? []).map(b => b.id)
      if (blockIds.length === 0) { setMatches([]); setLoading(false); return }

      const [{ data: allMatches, error: mErr }, { data: allEntries, error: eErr }] = await Promise.all([
        supabase.from('matches').select('*').in('block_id', blockIds).order('match_order'),
        supabase.from('entries').select('*').in('block_id', blockIds),
      ])
      if (mErr) throw mErr
      if (eErr) throw eErr

    // カテゴリ・ブロック順に全試合を並べて試合番号を付与
    const blockMap = new Map((blocks ?? []).map(b => [b.id, b]))
    const catMap = new Map((cats ?? []).map(c => [c.id, c]))
    const entryMap = new Map((allEntries ?? []).map(e => [e.id, e]))

    // ブロックの表示順: カテゴリsort_order → ブロック名
    const sortedBlocks = [...(blocks ?? [])].sort((a, b) => {
      const catA = catMap.get(a.category_id)?.sort_order ?? 0
      const catB = catMap.get(b.category_id)?.sort_order ?? 0
      return catA !== catB ? catA - catB : a.name.localeCompare(b.name)
    })

    // ブロックごとにmatch_order順で並べ、全ブロックをジッパー合流（まんべんなく進行）
    const matchesByBlock = new Map<string, typeof allMatches>(
      sortedBlocks.map(b => [b.id, []])
    )
    for (const m of allMatches ?? []) {
      matchesByBlock.get(m.block_id)?.push(m)
    }
    Array.from(matchesByBlock.values()).forEach(ms => {
      ms!.sort((a, b) => a.match_order - b.match_order)
    })
    const maxLen = Math.max(...Array.from(matchesByBlock.values()).map(ms => ms!.length), 0)
    const sorted: typeof allMatches = []
    for (let i = 0; i < maxLen; i++) {
      for (const blk of sortedBlocks) {
        const ms = matchesByBlock.get(blk.id)
        if (ms && ms[i]) sorted.push(ms[i])
      }
    }

    const withNumbers: ScheduleMatch[] = sorted.map((m, idx) => {
      const block = blockMap.get(m.block_id)
      const cat = block ? catMap.get(block.category_id) : undefined
      return {
        ...m,
        status: m.status as CallStatus,
        matchNumber: idx + 1,
        categoryName: cat?.name ?? '',
        blockName: block?.name ?? '',
        entry1: m.entry1_id ? entryMap.get(m.entry1_id) : undefined,
        entry2: m.entry2_id ? entryMap.get(m.entry2_id) : undefined,
      }
    })

      setMatches(withNumbers)
      setLoading(false)
    } catch (err: unknown) {
      console.error('schedule load error:', err)
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
      setLoadError(msg)
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('schedule-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  async function handleStatusChange(match: ScheduleMatch) {
    const next = NEXT_STATUS[match.status as CallStatus]
    if (!next) return
    setUpdating(match.id)
    const supabase = createClient()
    const { error } = await supabase.from('matches').update({ status: next }).eq('id', match.id)
    if (error) showToast('更新失敗: ' + error.message, 'error')
    else showToast(next === '呼び出し中' ? `📣 試合${match.matchNumber}番 呼び出し！` : `▶ 試合${match.matchNumber}番 開始`, 'info')
    setUpdating(null)
    load()
  }

  async function resetStatus(match: ScheduleMatch) {
    const supabase = createClient()
    await supabase.from('matches').update({ status: '未試合', score1: null, score2: null, winner_id: null }).eq('id', match.id)
    load()
  }

  const filtered = matches.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false
    if (catFilter !== 'all' && m.categoryName !== catFilter) return false
    return true
  })

  const counts = {
    '未試合': matches.filter(m => m.status === '未試合').length,
    '呼び出し中': matches.filter(m => m.status === '呼び出し中').length,
    '進行中': matches.filter(m => m.status === '進行中').length,
    '終了': matches.filter(m => m.status === '終了').length,
  }

  if (loading) return (
    <div className="space-y-3">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
  )

  if (loadError) return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">📣 進行表</h1>
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="font-bold text-red-700 mb-2">❌ データ読み込みエラー</div>
        <div className="text-sm text-red-600 font-mono">{loadError}</div>
        <button onClick={() => { setLoadError(''); setLoading(true); load() }} className="mt-3 bg-primary text-white rounded-xl px-4 py-2 text-sm font-bold">
          再試行
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 pb-10">
      <ToastContainer />

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📣 進行表</h1>
        <button onClick={() => window.print()} className="text-xs bg-gray-100 rounded-xl px-3 py-2 no-print">印刷</button>
      </div>

      {/* サマリーバッジ */}
      <div className="grid grid-cols-4 gap-2 no-print">
        {(['未試合', '呼び出し中', '進行中', '終了'] as CallStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(f => f === s ? 'all' : s)}
            className={`rounded-xl py-2 text-center transition-all border-2 ${
              filter === s ? 'border-primary' : 'border-transparent'
            } ${STATUS_STYLES[s]}`}
          >
            <div className={`text-xs font-bold px-1 py-0.5 rounded-full inline-block mb-1 ${STATUS_BADGE[s]}`}>{s}</div>
            <div className="text-xl font-bold">{counts[s]}</div>
          </button>
        ))}
      </div>

      {/* 種目フィルター */}
      <div className="no-print overflow-x-auto flex gap-2 pb-1">
        <button
          onClick={() => setCatFilter('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${catFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-500'}`}
        >
          全種目
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setCatFilter(c.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${catFilter === c.name ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-500'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 試合一覧 */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">表示する試合がありません</div>
      )}

      <div className="space-y-2">
        {filtered.map(m => {
          const status = m.status as CallStatus
          return (
            <div
              key={m.id}
              className={`border-2 rounded-2xl p-3 transition-all ${STATUS_STYLES[status]}`}
            >
              <div className="flex items-start gap-3">
                {/* 試合番号 */}
                <div className="shrink-0 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg">
                  {m.matchNumber}
                </div>

                {/* 試合情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-primary">{m.categoryName}</span>
                    <span className="text-xs text-gray-400">{m.blockName}</span>
                    {m.court && (
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        コート{m.court}
                      </span>
                    )}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-auto ${STATUS_BADGE[status]}`}>
                      {status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`flex-1 text-sm font-bold truncate text-right ${m.status === '終了' && m.winner_id === m.entry1_id ? 'text-primary' : ''}`}>
                      {m.entry1?.name ?? '未定'}
                    </span>
                    <span className="text-gray-300 text-xs shrink-0">
                      {m.status === '終了' ? `${m.score1}-${m.score2}` : 'vs'}
                    </span>
                    <span className={`flex-1 text-sm font-bold truncate ${m.status === '終了' && m.winner_id === m.entry2_id ? 'text-primary' : ''}`}>
                      {m.entry2?.name ?? '未定'}
                    </span>
                  </div>

                  {(m.entry1?.club || m.entry2?.club) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex-1 text-right text-xs text-gray-400 truncate">{m.entry1?.club}</span>
                      <span className="shrink-0 w-8" />
                      <span className="flex-1 text-xs text-gray-400 truncate">{m.entry2?.club}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ボタン */}
              {status !== '終了' && (
                <div className="flex gap-2 mt-3 no-print">
                  {/* 未試合 → 呼び出し中 */}
                  {status === '未試合' && (
                    <button
                      onClick={() => handleStatusChange(m)}
                      disabled={updating === m.id}
                      className="flex-1 rounded-xl py-3 font-bold text-sm bg-yellow-400 text-yellow-900 disabled:opacity-50"
                    >
                      {updating === m.id ? '...' : '📣 呼び出し'}
                    </button>
                  )}
                  {/* 呼び出し中: 取消 + 結果入力 */}
                  {status === '呼び出し中' && (
                    <>
                      <button
                        onClick={() => resetStatus(m)}
                        className="bg-gray-100 text-gray-500 rounded-xl px-4 py-3 text-sm"
                      >
                        取消
                      </button>
                      <a
                        href={`/admin/matches`}
                        className="flex-1 bg-primary text-white rounded-xl py-3 font-bold text-sm text-center"
                      >
                        結果入力→
                      </a>
                    </>
                  )}
                  {/* 進行中 → 結果入力 */}
                  {status === '進行中' && (
                    <a
                      href={`/admin/matches`}
                      className="flex-1 bg-primary text-white rounded-xl py-3 font-bold text-sm text-center"
                    >
                      結果入力→
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
