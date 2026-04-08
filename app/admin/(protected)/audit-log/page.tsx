import { db } from '@/lib/db'
import { Suspense } from 'react'
import Link from 'next/link'
import AuditTimeline from '@/components/features/admin/AuditTimeline'
import AuditLogFilters from '@/components/features/admin/AuditLogFilters'

const PER_PAGE = 50

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; eventId?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const where = {
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.eventId ? { eventId: sp.eventId } : {}),
  }

  const [logs, totalCount, events, rawActionTypes] = await Promise.all([
    db.auditLog.findMany({
      include: { actor: { select: { name: true } } },
      where,
      orderBy: { createdAt: 'desc' },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
    }),
    db.auditLog.count({ where }),
    db.event.findMany({
      select: { id: true, title: true },
      orderBy: { startTime: 'desc' },
    }),
    db.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
    }),
  ])

  const actionTypes = rawActionTypes.map(r => r.action).sort()
  const totalPages = Math.ceil(totalCount / PER_PAGE)

  function buildUrl(newPage: number) {
    const params = new URLSearchParams()
    if (sp.action) params.set('action', sp.action)
    if (sp.eventId) params.set('eventId', sp.eventId)
    if (newPage > 1) params.set('page', String(newPage))
    const qs = params.toString()
    return `/admin/audit-log${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Audit Log</h1>

      <Suspense fallback={<div className="flex gap-3 mb-4 h-10 animate-pulse bg-gray-100 rounded-lg max-w-md" />}>
        <AuditLogFilters
          events={events}
          actionTypes={actionTypes}
          currentAction={sp.action ?? ''}
          currentEventId={sp.eventId ?? ''}
        />
      </Suspense>

      <p className="text-sm text-gray-500 mb-4">
        {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
        {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <AuditTimeline entries={logs.map(l => ({
          id: l.id,
          action: l.action,
          actor: l.actor,
          createdAt: l.createdAt.toISOString(),
          metadata: l.metadata,
        }))} />
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          {page > 1 && (
            <Link href={buildUrl(page - 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              ← Previous
            </Link>
          )}
          {page < totalPages && (
            <Link href={buildUrl(page + 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
