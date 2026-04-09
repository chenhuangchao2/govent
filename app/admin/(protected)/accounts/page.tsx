import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AccountsPanel from '@/components/features/admin/AccountsPanel'

export default async function AccountsPage() {
  const session = await requireAdmin()
  if (!session) redirect('/admin/login')
  if (!session.isSuperAdmin) redirect('/admin')

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Accounts</h1>
      <AccountsPanel
        currentUserId={session.userId!}
        accounts={users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          isSuperAdmin: u.isSuperAdmin,
          createdAt: u.createdAt.toISOString(),
          eventCount: u._count.events,
        }))}
      />
    </div>
  )
}
