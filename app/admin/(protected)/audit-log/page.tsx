import { db } from '@/lib/db'
import { Suspense } from 'react'
import Link from 'next/link'
import AuditLogList from '@/components/features/admin/AuditLogList'
import AuditLogFilters from '@/components/features/admin/AuditLogFilters'

const PER_PAGE = 50

function getPeriodFilter(period: string | undefined) {
  if (!period) return {}
  const now = new Date()
  let since: Date
  switch (period) {
    case 'today':
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case '7d':
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      return {}
  }
  return { createdAt: { gte: since } }
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; eventId?: string; page?: string; period?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const where = {
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.eventId ? { eventId: sp.eventId } : {}),
    ...getPeriodFilter(sp.period),
  }

  const [logs, totalCount, events, rawActionTypes] = await Promise.all([
    db.auditLog.findMany({
      include: {
        actor: { select: { name: true } },
        event: { select: { title: true } },
      },
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
    if (sp.period) params.set('period', sp.period)
    if (newPage > 1) params.set('page', String(newPage))
    const qs = params.toString()
    return `/admin/audit-log${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <span className="text-sm text-gray-400">
          {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
          {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
        </span>
      </div>

      <Suspense fallback={<div className="flex gap-3 mb-4 h-10 animate-pulse bg-gray-100 rounded-lg max-w-lg" />}>
        <AuditLogFilters
          events={events}
          actionTypes={actionTypes}
          currentAction={sp.action ?? ''}
          currentEventId={sp.eventId ?? ''}
          currentPeriod={sp.period ?? ''}
        />
      </Suspense>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <AuditLogList entries={logs.map(l => ({
          id: l.id,
          action: l.action,
          actor: l.actor,
          eventTitle: l.event?.title ?? null,
          createdAt: l.createdAt.toISOString(),
          metadata: l.metadata as Record<string, unknown> | null,
        }))} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div>
            {page > 1 && (
              <Link href={buildUrl(page - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ← Previous
              </Link>
            )}
          </div>
          <div>
            {page < totalPages && (
              <Link href={buildUrl(page + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
