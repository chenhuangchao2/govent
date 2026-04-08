import { db } from '@/lib/db'
import BlacklistTable from '@/components/features/admin/BlacklistTable'

export default async function BlacklistPage() {
  const entries = await db.blacklist.findMany({ orderBy: { addedAt: 'desc' } })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Blacklist</h1>
      <BlacklistTable initial={entries.map(e => ({
        id: e.id,
        email: e.email,
        reason: e.reason,
        source: e.source,
        noShowCount: e.noShowCount,
        addedAt: e.addedAt.toISOString(),
        isActive: e.isActive,
      }))} />
    </div>
  )
}
