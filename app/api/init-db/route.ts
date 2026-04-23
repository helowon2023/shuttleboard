import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// テーブルが存在するか確認する
async function tableExists(supabase: Awaited<ReturnType<typeof createClient>>, table: string) {
  const { error } = await supabase.from(table as 'tournaments').select('id').limit(1)
  // テーブルが無い場合は error.code === '42P01' (relation does not exist)
  return !error || error.code !== '42P01'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未ログイン' }, { status: 401 })

  const tables = ['tournaments', 'categories', 'blocks', 'entries', 'matches', 'teams', 'ties', 'rubbers']
  const results: Record<string, boolean> = {}
  for (const t of tables) {
    results[t] = await tableExists(supabase, t)
  }

  const missing = tables.filter(t => !results[t])
  return NextResponse.json({ tables: results, missing, ok: missing.length === 0 })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '未ログイン' }, { status: 401 })

  // supabase-js では DDL は実行できないため、
  // テーブルの存在確認と不足テーブルのリストを返す
  const tables = ['tournaments', 'categories', 'blocks', 'entries', 'matches', 'teams', 'ties', 'rubbers']
  const missing: string[] = []
  for (const t of tables) {
    const exists = await tableExists(supabase, t)
    if (!exists) missing.push(t)
  }

  return NextResponse.json({ missing, ok: missing.length === 0 })
}
