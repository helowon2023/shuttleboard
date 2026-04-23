import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/layout/AdminNav'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-dvh bg-background">
      <OfflineBanner />
      <AdminNav />
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
