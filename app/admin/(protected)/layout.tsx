import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  if (!session) redirect('/admin/login')

  return (
    <div className="flex">
      <AdminSidebar isSuperAdmin={session.isSuperAdmin ?? false} />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">{children}</main>
    </div>
  )
}
