'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません')
        setLoading(false)
        return
      }
      router.push('/admin')
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message.includes('already registered')
          ? 'このメールアドレスは既に登録されています'
          : '登録に失敗しました: ' + error.message)
        setLoading(false)
        return
      }
      setMessage('確認メールを送りました。メールのリンクをクリックしてください。（メール確認が不要な設定の場合はそのままログインできます）')
      setLoading(false)
      setMode('login')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏸</div>
          <h1 className="text-2xl font-bold text-primary">シャトルボード</h1>
          <p className="text-gray-500 text-sm mt-1">管理者{mode === 'login' ? 'ログイン' : 'アカウント作成'}</p>
        </div>

        {/* モード切り替えタブ */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setMessage('') }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setMessage('') }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'signup' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">{error}</div>
          )}
          {message && (
            <div className="bg-green-50 text-green-700 rounded-xl p-3 text-sm">{message}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード{mode === 'signup' && <span className="text-gray-400 font-normal text-xs ml-1">（6文字以上）</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-xl py-4 font-bold text-lg disabled:opacity-50"
          >
            {loading
              ? (mode === 'login' ? 'ログイン中...' : '登録中...')
              : (mode === 'login' ? 'ログイン' : 'アカウントを作成')}
          </button>
        </form>

        {mode === 'signup' && (
          <div className="bg-blue-50 rounded-2xl p-4 mt-4 text-xs text-blue-700">
            <div className="font-bold mb-1">はじめての方へ</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>メールアドレスとパスワードを入力して「アカウントを作成」</li>
              <li>確認メールが届いたらリンクをクリック</li>
              <li>「ログイン」タブに戻ってサインイン</li>
            </ol>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          速報ページはQRコードからアクセスしてください
        </p>
      </div>
    </div>
  )
}
