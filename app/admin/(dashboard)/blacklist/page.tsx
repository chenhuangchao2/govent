import { db } from '@/lib/db'
import BlacklistTable from './blacklist-table'

export const dynamic = 'force-dynamic'

export default async function BlacklistPage() {
  const entries = await db.blacklist.findMany({ orderBy: { addedAt: 'desc' } })

  // Serialize dates to strings for the client component
  const serialized = entries.map((e) => ({
    ...e,
    addedAt: e.addedAt.toISOString(),
    removedAt: e.removedAt?.toISOString() ?? null,
  }))

  return <BlacklistTable entries={serialized} />
}
