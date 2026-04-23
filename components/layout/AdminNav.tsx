'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: '📋 準備', exact: true },
  { href: '/admin/blocks', label: '👥 ブロック' },
  { href: '/admin/draw', label: '🗂️ 組合せ' },
  { href: '/admin/schedule', label: '📣 進行表' },
  { href: '/admin/matches', label: '▶ 試合' },
  { href: '/admin/results', label: '📊 結果' },
  { href: '/admin/finals', label: '🏆 決勝' },
  { href: '/admin/program', label: '📄 プログラム' },
  { href: '/admin/scoresheet', label: '📝 スコア用紙' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="admin-nav bg-white border-b border-gray-200 sticky top-0 z-40 no-print">
      <div className="max-w-2xl mx-auto px-3 flex items-center gap-1 overflow-x-auto">
        <span className="text-primary font-bold text-sm mr-2 whitespace-nowrap py-3">🏸</span>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium px-3 py-3 whitespace-nowrap border-b-2 transition-colors ${
              isActive(item.href, item.exact)
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="ml-auto text-xs text-gray-400 py-3 px-2 whitespace-nowrap min-h-0"
        >
          ログアウト
        </button>
      </div>
    </nav>
  )
}
