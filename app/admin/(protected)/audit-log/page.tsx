import { db } from '@/lib/db'
import AuditTimeline from '@/components/features/admin/AuditTimeline'

export default async function AuditLogPage() {
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <AuditTimeline entries={logs.map(l => ({
          id: l.id,
          action: l.action,
          actor: l.actor,
          createdAt: l.createdAt.toISOString(),
          metadata: l.metadata,
        }))} />
      </div>
    </div>
  )
}
