'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { generateRoundRobinWithClubs } from '@/lib/logic/roundRobin'
import type { Category, Entry, Block } from '@/lib/types'

type Step = 'db-check' | 1 | 2 | 3 | 4

const TEAM_FORMATS = ['S+S+D', 'D+D+D', 'S+D+D', 'S+S+D+D+D']

const SQL_SCHEMA = `-- Supabase SQL Editor に貼り付けて実行してください

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_range text,
  venue text,
  status text default '準備中',
  public_url text unique,
  logo_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  type text not null,
  name text not null,
  code text,
  format text,
  sort_order int default 0
);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  name text not null,
  block_type text default 'league',
  venue_area text,
  created_at timestamptz default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete cascade,
  name text not null,
  player2 text,
  club text,
  seed int,
  sort_order int default 0
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete cascade,
  entry1_id uuid references entries(id),
  entry2_id uuid references entries(id),
  score1 int,
  score2 int,
  winner_id uuid references entries(id),
  court text,
  round int default 1,
  match_order int,
  status text default '未試合',
  played_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete cascade,
  name text not null,
  club text,
  sort_order int default 0
);

create table if not exists ties (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references blocks(id) on delete cascade,
  team1_id uuid references teams(id),
  team2_id uuid references teams(id),
  winner_team_id uuid references teams(id),
  team1_rubbers int default 0,
  team2_rubbers int default 0,
  status text default '未試合',
  match_order int
);

create table if not exists rubbers (
  id uuid primary key default gen_random_uuid(),
  tie_id uuid references ties(id) on delete cascade,
  rubber_no int not null,
  rubber_type text not null,
  label text not null,
  team1_p1 text, team1_p2 text, team2_p1 text, team2_p2 text,
  score1 int, score2 int,
  winner_team_id uuid references teams(id),
  court text,
  status text default '未試合',
  played_at timestamptz
);

-- RLS: 全員が読み取り可能
alter table tournaments enable row level security;
alter table categories enable row level security;
alter table blocks enable row level security;
alter table entries enable row level security;
alter table matches enable row level security;
alter table teams enable row level security;
alter table ties enable row level security;
alter table rubbers enable row level security;

create policy "public read" on tournaments for select using (true);
create policy "public read" on categories for select using (true);
create policy "public read" on blocks for select using (true);
create policy "public read" on entries for select using (true);
create policy "public read" on matches for select using (true);
create policy "public read" on teams for select using (true);
create policy "public read" on ties for select using (true);
create policy "public read" on rubbers for select using (true);

create policy "auth write" on tournaments for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth write" on categories for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth write" on blocks for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth write" on entries for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth write" on matches for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth write" on teams for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth write" on ties for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "auth write" on rubbers for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Realtime
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table rubbers;
alter publication supabase_realtime add table ties;`

export default function SetupPage() {
  const [step, setStep] = useState<Step>('db-check')
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'missing'>('checking')
  const [missingTables, setMissingTables] = useState<string[]>([])
  const [showSQL, setShowSQL] = useState(false)
  const [copied, setCopied] = useState(false)

  const [tournamentId, setTournamentId] = useState('')
  const [categories, setCategories] = useState<(Category & { _entries: Entry[] })[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const { showToast, ToastContainer } = useToast()
  const router = useRouter()

  // STEP 1
  const [name, setName] = useState('')
  const [dateRange, setDateRange] = useState('')
  const [venue, setVenue] = useState('')
  const [slug, setSlug] = useState('')

  // STEP 2
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<'individual' | 'team'>('individual')
  const [newCatFormat, setNewCatFormat] = useState('singles')

  // STEP 3
  const [selectedCatId, setSelectedCatId] = useState('')
  const [entriesText, setEntriesText] = useState('')
  const [blockCount, setBlockCount] = useState(1)

  // STEP 4
  const [blockType] = useState<'league' | 'tournament'>('league')

  // DB確認
  useEffect(() => {
    checkDb()
  }, [])

  function isTableMissingError(error: { code?: string; message?: string } | null) {
    if (!error) return false
    return (
      error.code === 'PGRST205' ||   // PostgREST: table not in schema cache
      error.code === '42P01' ||       // Postgres: relation does not exist
      (error.message ?? '').includes('schema cache') ||
      (error.message ?? '').includes('does not exist') ||
      (error.message ?? '').includes('relation')
    )
  }

  async function checkDb() {
    setDbStatus('checking')
    const supabase = createClient()
    const tables = ['tournaments', 'categories', 'blocks', 'entries', 'matches']
    const missing: string[] = []
    for (const t of tables) {
      const { error } = await supabase.from(t as 'tournaments').select('id').limit(1)
      if (isTableMissingError(error)) {
        missing.push(t)
      }
    }
    setMissingTables(missing)
    setDbStatus(missing.length === 0 ? 'ok' : 'missing')
    if (missing.length === 0) setStep(1)
  }

  function copySQL() {
    navigator.clipboard.writeText(SQL_SCHEMA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleStep1() {
    if (!name || !slug) { showToast('大会名とURLを入力してください', 'error'); return }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tournaments')
      .insert({ name, date_range: dateRange || null, venue: venue || null, public_url: slug, status: '準備中' })
      .select()
      .single()
    if (error) {
      if (isTableMissingError(error)) {
        // テーブル未作成 → DB確認画面へ戻してSQLを表示
        setDbStatus('missing')
        setMissingTables(['tournaments', 'categories', 'blocks', 'entries', 'matches', 'teams', 'ties', 'rubbers'])
        setStep('db-check')
        return
      }
      const msg = error.code === '23505'
        ? `URL "${slug}" は既に使われています。別のURLを入力してください`
        : `保存エラー: ${error.message} (${error.code})`
      showToast(msg, 'error')
      return
    }
    setTournamentId(data.id)
    showToast('大会情報を保存しました')
    setStep(2)
  }

  async function addCategory() {
    if (!newCatName) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .insert({
        tournament_id: tournamentId,
        name: newCatName,
        type: newCatType,
        format: newCatFormat,
        sort_order: categories.length,
      })
      .select()
      .single()
    if (error) { showToast(`エラー: ${error.message}`, 'error'); return }
    if (!data) return
    setCategories(prev => [...prev, { ...data, _entries: [] }])
    setNewCatName('')
    showToast('種目を追加しました')
  }

  async function handleStep3Entries() {
    if (!selectedCatId || !entriesText.trim()) { showToast('種目と参加者を入力してください', 'error'); return }
    const supabase = createClient()

    const lines = entriesText.split('\n').filter(l => l.trim())
    const parsedEntries = lines.map(line => {
      const parts = line.split(',')
      return { name: parts[0].trim(), club: parts[1]?.trim() ?? null }
    })

    // 既存ブロックを削除して再作成（やり直し対応）
    const existingBlocks = blocks.filter(b => b.category_id === selectedCatId)
    if (existingBlocks.length > 0) {
      await supabase.from('blocks').delete().in('id', existingBlocks.map(b => b.id))
      setBlocks(prev => prev.filter(b => b.category_id !== selectedCatId))
    }

    // ブロック数に応じて均等分配（同クラブを別ブロックに分散）
    const blockNames = ['Aブロック','Bブロック','Cブロック','Dブロック','Eブロック','Fブロック']
    const actualBlockCount = Math.min(blockCount, parsedEntries.length)

    // クラブごとに分けて、ブロックに均等配置
    const clubGroups = new Map<string, typeof parsedEntries>()
    for (const e of parsedEntries) {
      const key = e.club ?? '__none'
      if (!clubGroups.has(key)) clubGroups.set(key, [])
      clubGroups.get(key)!.push(e)
    }
    const groupList = Array.from(clubGroups.values()).sort((a, b) => b.length - a.length)

    // ラウンドロビン式にブロックへ振り分け
    const blockBuckets: typeof parsedEntries[] = Array.from({ length: actualBlockCount }, () => [])
    let bi = 0
    for (const group of groupList) {
      for (const e of group) {
        blockBuckets[bi % actualBlockCount].push(e)
        bi++
      }
    }

    const newBlocks: Block[] = []
    for (let i = 0; i < actualBlockCount; i++) {
      const bucket = blockBuckets[i]
      if (bucket.length === 0) continue
      const { data: blockData, error: blockErr } = await supabase
        .from('blocks')
        .insert({ category_id: selectedCatId, name: blockNames[i] ?? `${i+1}ブロック`, block_type: blockType })
        .select().single()
      if (blockErr) { showToast(`ブロック作成エラー: ${blockErr.message}`, 'error'); return }
      if (!blockData) continue
      newBlocks.push(blockData)

      const insertData = bucket.map((e, idx) => ({
        block_id: blockData.id, name: e.name, club: e.club, sort_order: idx,
      }))
      const { error } = await supabase.from('entries').insert(insertData)
      if (error) { showToast(`登録エラー: ${error.message}`, 'error'); return }
    }

    setBlocks(prev => [...prev.filter(b => b.category_id !== selectedCatId), ...newBlocks])
    showToast(`${parsedEntries.length}名を${actualBlockCount}ブロックに登録しました`)
    setEntriesText('')
  }

  async function generateMatches() {
    const supabase = createClient()

    // stateではなくDBから直接ブロックを取得（ページ再読み込みでも確実に動く）
    if (!tournamentId) { showToast('大会情報が見つかりません。STEP1からやり直してください', 'error'); return }

    const { data: cats } = await supabase.from('categories').select('id').eq('tournament_id', tournamentId)
    const catIds = cats?.map(c => c.id) ?? []
    if (catIds.length === 0) { showToast('種目が登録されていません', 'error'); return }

    const { data: dbBlocks } = await supabase.from('blocks').select('*').in('category_id', catIds)
    if (!dbBlocks || dbBlocks.length === 0) { showToast('ブロック・参加者をSTEP3で先に登録してください', 'error'); return }

    let generated = 0
    for (const block of dbBlocks) {
      const { data: entries } = await supabase.from('entries').select('*').eq('block_id', block.id).order('sort_order')
      if (!entries || entries.length < 2) continue

      // 既存の試合を削除（再生成対応）
      await supabase.from('matches').delete().eq('block_id', block.id)

      const entryWithClub = entries.map((e, i) => ({ index: i, club: e.club }))
      const seeds = generateRoundRobinWithClubs(entryWithClub)
      const matchData = seeds.map(seed => ({
        block_id: block.id,
        entry1_id: entries[seed.entry1_index].id,
        entry2_id: entries[seed.entry2_index].id,
        round: 1,
        match_order: seed.match_order,
        status: '未試合',
      }))
      const { error } = await supabase.from('matches').insert(matchData)
      if (error) { showToast(`対戦生成エラー: ${error.message}`, 'error'); return }
      generated += matchData.length
    }

    if (generated === 0) {
      showToast('参加者が各ブロック2名以上必要です', 'error')
      return
    }
    showToast(`${generated}試合を生成しました（同クラブ回避済み）`)
    router.push('/admin/schedule')
  }

  function generateSlug() {
    const year = new Date().getFullYear()
    const base = name.replace(/[^\w]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '')
    setSlug(`${base}-${year}`)
  }

  // ── DB確認画面 ──
  if (step === 'db-check') {
    return (
      <div className="space-y-4">
        <ToastContainer />
        <h1 className="text-xl font-bold">⚙️ データベース確認</h1>

        {dbStatus === 'checking' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-3 animate-spin">⚙️</div>
            <div className="text-gray-500">データベースを確認中...</div>
          </div>
        )}

        {dbStatus === 'ok' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold text-green-700">データベース接続OK</div>
            <button onClick={() => setStep(1)} className="mt-4 bg-primary text-white rounded-xl px-8 py-3 font-bold">
              大会作成を開始する →
            </button>
          </div>
        )}

        {dbStatus === 'missing' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="font-bold text-red-700 mb-2">❌ テーブルが未作成です</div>
              <div className="text-sm text-red-600 mb-3">
                不足しているテーブル: <span className="font-mono">{missingTables.join(', ')}</span>
              </div>
              <p className="text-sm text-gray-600">
                Supabaseの <strong>SQL Editor</strong> で下のSQLを実行してください。
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              <div className="font-bold">📋 手順</div>
              <ol className="text-sm space-y-2 text-gray-700 list-decimal list-inside">
                <li>下の「📋 SQLをコピー」ボタンを押す</li>
                <li>「Supabase SQL Editor を開く」ボタンで画面を開く</li>
                <li>貼り付けて画面右上の「Run」を押す</li>
                <li>このページに戻って「🔄 再確認する」を押す</li>
              </ol>

              <button
                onClick={copySQL}
                className="w-full bg-primary text-white rounded-xl py-4 font-bold text-lg"
              >
                {copied ? '✅ コピーしました！' : '📋 SQLをコピー（ここを押す）'}
              </button>

              <a
                href="https://supabase.com/dashboard/project/votpubqwoowfkwlzcfog/sql/new"
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center bg-gray-800 text-white rounded-xl py-3 font-bold"
              >
                Supabase SQL Editor を開く ↗
              </a>

              <button
                onClick={() => setShowSQL(v => !v)}
                className="w-full bg-gray-100 text-gray-600 rounded-xl py-2 text-sm"
              >
                {showSQL ? 'SQLを隠す' : 'SQLを表示する'}
              </button>

              {showSQL && (
                <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-x-auto max-h-60 overflow-y-auto">
                  {SQL_SCHEMA}
                </pre>
              )}

              <button
                onClick={checkDb}
                className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-medium"
              >
                🔄 再確認する
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── STEP 1〜4 ──
  const stepLabels = ['大会情報', '種目', '参加者', 'ブロック']

  return (
    <div className="space-y-6 pb-8">
      <ToastContainer />

      <div className="flex gap-1">
        {([1, 2, 3, 4] as const).map(s => (
          <div key={s} className={`flex-1 text-center text-xs font-bold py-2 rounded-xl ${
            step === s ? 'bg-primary text-white' :
            (step as number) > s ? 'bg-done text-white' :
            'bg-gray-100 text-gray-400'
          }`}>
            {stepLabels[s - 1]}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-lg">STEP 1: 大会情報</h2>
          <div>
            <label className="text-sm font-medium text-gray-700">大会名 *</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary" value={name} onChange={e => setName(e.target.value)} placeholder="例: 第10回倉敷バドミントン大会" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">日程</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary" value={dateRange} onChange={e => setDateRange(e.target.value)} placeholder="例: 2026/3/28-30" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">会場</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-primary" value={venue} onChange={e => setVenue(e.target.value)} placeholder="例: 倉敷市体育館" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">速報URL (スラッグ) *</label>
            <div className="flex gap-2 mt-1">
              <input className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary" value={slug} onChange={e => setSlug(e.target.value)} placeholder="例: kurashiki-2026" />
              <button onClick={generateSlug} disabled={!name} className="bg-gray-100 rounded-xl px-3 py-2 text-sm disabled:opacity-40">自動生成</button>
            </div>
            {slug && (
              <div className="text-xs text-gray-400 mt-1 break-all">
                速報URL: {process.env.NEXT_PUBLIC_APP_URL ?? 'https://shuttleboard.vercel.app'}/{slug}
              </div>
            )}
          </div>
          <button onClick={handleStep1} className="w-full bg-primary text-white rounded-xl py-4 font-bold">次へ →</button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-lg">STEP 2: 種目登録</h2>
          {categories.length > 0 && (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{cat.type === 'individual' ? '個人' : '団体'}</span>
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{cat.format}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="種目名 例: 小学6年男子" />
            <div className="flex gap-2">
              {(['individual', 'team'] as const).map(t => (
                <button key={t} onClick={() => setNewCatType(t)} className={`flex-1 rounded-xl py-2 text-sm font-medium ${newCatType === t ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                  {t === 'individual' ? '個人戦' : '団体戦'}
                </button>
              ))}
            </div>
            {newCatType === 'individual' && (
              <div className="flex gap-2">
                {(['singles', 'doubles'] as const).map(f => (
                  <button key={f} onClick={() => setNewCatFormat(f)} className={`flex-1 rounded-xl py-2 text-sm font-medium ${newCatFormat === f ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                    {f === 'singles' ? 'シングルス' : 'ダブルス'}
                  </button>
                ))}
              </div>
            )}
            {newCatType === 'team' && (
              <select value={newCatFormat} onChange={e => setNewCatFormat(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2">
                {TEAM_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            <button onClick={addCategory} className="w-full bg-done text-white rounded-xl py-3 font-bold">種目を追加</button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium">← 戻る</button>
            <button onClick={() => { if (categories.length > 0) setStep(3); else showToast('種目を1つ以上追加してください', 'error') }} className="flex-1 bg-primary text-white rounded-xl py-3 font-bold">次へ →</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-lg">STEP 3: 参加者登録</h2>
          <div>
            <label className="text-sm font-medium text-gray-700">種目を選択</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 focus:outline-none" value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}>
              <option value="">選択してください</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">ブロック数</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[1,2,3,4,5,6].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBlockCount(n)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${blockCount === n ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {n === 1 ? '1（分けない）' : `${n}ブロック`}
                </button>
              ))}
            </div>
            {blockCount > 1 && (
              <p className="text-xs text-blue-600 mt-1">同じクラブは自動的に別ブロックに分散されます</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">参加者（1行1人、カンマで所属クラブ追加可）</label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 focus:outline-none focus:border-primary h-40 font-mono text-sm"
              value={entriesText}
              onChange={e => setEntriesText(e.target.value)}
              placeholder={'山田太郎,倉敷クラブ\n鈴木花子,岡山クラブ\n田中次郎'}
            />
          </div>
          <button onClick={handleStep3Entries} className="w-full bg-done text-white rounded-xl py-3 font-bold">参加者を登録</button>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium">← 戻る</button>
            <button onClick={() => setStep(4)} className="flex-1 bg-primary text-white rounded-xl py-3 font-bold">次へ →</button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-lg">STEP 4: 対戦を自動生成</h2>
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            登録された参加者で総当たり対戦を自動生成します。生成後は「組み合わせ」ページで確認できます。
          </div>
          {blocks.length === 0 && (
            <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-700">
              ⚠️ STEP 3で参加者を登録してから対戦生成してください
            </div>
          )}
          <button onClick={generateMatches} disabled={blocks.length === 0} className="w-full bg-accent text-white rounded-xl py-4 font-bold text-lg disabled:opacity-40">
            対戦を自動生成 🎯
          </button>
          <button onClick={() => setStep(3)} className="w-full bg-gray-100 text-gray-600 rounded-xl py-3 font-medium">← 戻る</button>
        </div>
      )}
    </div>
  )
}
