import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AccountsPanel } from './accounts-panel'

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await requireAdmin()
  if (!session?.isSuperAdmin) redirect('/admin')

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AccountsPanel
      users={users}
      currentUserId={session.userId!}
    />
  )
}
