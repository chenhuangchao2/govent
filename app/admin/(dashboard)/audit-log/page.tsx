'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { formatRelativeTime } from '@/lib/utils'

/* ── Types ── */
interface AuditLog {
  id: string
  action: string
  actorId: string | null
  actor: { name: string; email: string } | null
  eventId: string | null
  event?: { title: string } | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

/* ── Action colour mapping ── */
const ACTION_STYLES: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  CREATE_EVENT: {
    color: 'text-primary',
    bg: 'bg-primary-fixed/30',
    icon: <PostAddIcon />,
  },
  UPDATE_EVENT: {
    color: 'text-primary',
    bg: 'bg-primary-fixed/30',
    icon: <EditIcon />,
  },
  PUBLISH_EVENT: {
    color: 'text-primary',
    bg: 'bg-primary-fixed/30',
    icon: <PublishIcon />,
  },
  UNPUBLISH_EVENT: {
    color: 'text-outline',
    bg: 'bg-surface-container-high/40',
    icon: <UnpublishIcon />,
  },
  CANCEL_EVENT: {
    color: 'text-outline',
    bg: 'bg-surface-container-high/40',
    icon: <CancelIcon />,
  },
  APPROVE: {
    color: 'text-green-700',
    bg: 'bg-green-100/50',
    icon: <ApproveIcon />,
  },
  BULK_APPROVE: {
    color: 'text-green-700',
    bg: 'bg-green-100/50',
    icon: <ApproveIcon />,
  },
  REJECT: {
    color: 'text-red-600',
    bg: 'bg-red-100/50',
    icon: <RejectIcon />,
  },
  CANCEL_REGISTRATION: {
    color: 'text-outline',
    bg: 'bg-surface-container-high/40',
    icon: <CancelIcon />,
  },
  CHECKIN: {
    color: 'text-purple-700',
    bg: 'bg-purple-100/50',
    icon: <CheckinIcon />,
  },
  ADD_BLACKLIST: {
    color: 'text-red-600',
    bg: 'bg-red-100/50',
    icon: <BlockIcon />,
  },
  REMOVE_BLACKLIST: {
    color: 'text-green-700',
    bg: 'bg-green-100/50',
    icon: <UnblockIcon />,
  },
  MARK_PAID: {
    color: 'text-green-700',
    bg: 'bg-green-100/50',
    icon: <PaymentIcon />,
  },
  BROADCAST: {
    color: 'text-primary',
    bg: 'bg-primary-fixed/30',
    icon: <BroadcastIcon />,
  },
}

const DEFAULT_STYLE = {
  color: 'text-outline',
  bg: 'bg-surface-container-high/40',
  icon: <DefaultIcon />,
}

const ITEMS_PER_PAGE = 50

/* ── Date helpers ── */
function getDateGroupKey(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const entryDate = new Date(d)
  entryDate.setHours(0, 0, 0, 0)

  if (entryDate.getTime() === today.getTime()) return 'TODAY'
  if (entryDate.getTime() === yesterday.getTime()) return 'YESTERDAY'
  return entryDate.toISOString().slice(0, 10)
}

function formatGroupLabel(key: string, firstIso: string): string {
  const d = new Date(firstIso)
  const formatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()
  if (key === 'TODAY') return `TODAY \u2014 ${formatted}`
  if (key === 'YESTERDAY') return `YESTERDAY \u2014 ${formatted}`
  return formatted
}

function isWithinPeriod(iso: string, period: string): boolean {
  if (period === 'all') return true
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diff = now - t
  if (period === 'today') return diff < 86400000
  if (period === '7d') return diff < 7 * 86400000
  if (period === '30d') return diff < 30 * 86400000
  return true
}

/* ── Metadata description ── */
function describeAction(log: AuditLog): string {
  const meta = log.metadata as Record<string, unknown> | null
  const eventTitle = (log as { event?: { title?: string } }).event?.title
    || (meta?.eventTitle as string)
    || ''

  switch (log.action) {
    case 'CREATE_EVENT':
      return eventTitle ? `Created event "${eventTitle}"` : 'Created a new event'
    case 'UPDATE_EVENT':
      return eventTitle ? `Updated event "${eventTitle}"` : 'Updated an event'
    case 'PUBLISH_EVENT':
      return eventTitle ? `Published event "${eventTitle}"` : 'Published an event'
    case 'UNPUBLISH_EVENT':
      return eventTitle ? `Unpublished event "${eventTitle}"` : 'Unpublished an event'
    case 'CANCEL_EVENT':
      return eventTitle ? `Cancelled event "${eventTitle}"` : 'Cancelled an event'
    case 'APPROVE':
      return meta?.registrantEmail
        ? `Approved registration for ${meta.registrantEmail}${eventTitle ? ` — ${eventTitle}` : ''}`
        : 'Approved a registration'
    case 'BULK_APPROVE':
      return meta?.count
        ? `Bulk approved ${meta.count} registrations${eventTitle ? ` — ${eventTitle}` : ''}`
        : 'Bulk approved registrations'
    case 'REJECT':
      return meta?.registrantEmail
        ? `Rejected registration for ${meta.registrantEmail}${meta?.reason ? ` (${meta.reason})` : ''}`
        : 'Rejected a registration'
    case 'CANCEL_REGISTRATION':
      return meta?.registrantEmail
        ? `Cancelled registration for ${meta.registrantEmail}`
        : 'Cancelled a registration'
    case 'CHECKIN':
      return meta?.registrantEmail
        ? `Checked in ${meta.registrantEmail}${eventTitle ? ` at ${eventTitle}` : ''}`
        : 'Checked in a participant'
    case 'ADD_BLACKLIST':
      return meta?.email
        ? `Added ${meta.email} to blacklist${meta?.reason ? ` — ${meta.reason}` : ''}`
        : 'Added to blacklist'
    case 'REMOVE_BLACKLIST':
      return meta?.email
        ? `Removed ${meta.email} from blacklist`
        : 'Removed from blacklist'
    case 'MARK_PAID':
      return meta?.registrantEmail
        ? `Marked payment received for ${meta.registrantEmail}`
        : 'Marked payment received'
    case 'BROADCAST':
      return eventTitle
        ? `Sent broadcast email for "${eventTitle}"`
        : 'Sent broadcast email'
    default: {
      if (meta?.description) return String(meta.description)
      return log.action.replace(/_/g, ' ').toLowerCase()
    }
  }
}

/* ── Main Component ── */
export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [period, setPeriod] = useState('7d')
  const [actionFilter, setActionFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/audit')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setLogs(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Unique action types + event titles for filter dropdowns
  const actionTypes = useMemo(
    () => [...new Set(logs.map((l) => l.action))].sort(),
    [logs],
  )
  const eventOptions = useMemo(() => {
    const map = new Map<string, string>()
    logs.forEach((l) => {
      if (l.eventId) {
        const title =
          (l as { event?: { title?: string } }).event?.title ||
          (l.metadata as Record<string, unknown>)?.eventTitle as string ||
          null
        if (title) map.set(l.eventId, title)
      }
    })
    return Array.from(map.entries())
  }, [logs])

  // Client-side filtering
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (!isWithinPeriod(l.createdAt, period)) return false
      if (actionFilter && l.action !== actionFilter) return false
      if (eventFilter && l.eventId !== eventFilter) return false
      return true
    })
  }, [logs, period, actionFilter, eventFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  // Group by date
  const groups = useMemo(() => {
    const map = new Map<string, AuditLog[]>()
    paged.forEach((l) => {
      const key = getDateGroupKey(l.createdAt)
      const arr = map.get(key) || []
      arr.push(l)
      map.set(key, arr)
    })
    return Array.from(map.entries())
  }, [paged])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [period, actionFilter, eventFilter])

  const startIdx = (safePage - 1) * ITEMS_PER_PAGE + 1
  const endIdx = Math.min(safePage * ITEMS_PER_PAGE, filtered.length)

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero Header */}
      <section className="space-y-3">
        <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
          Audit Log
        </h1>
        <p className="text-on-surface/60 max-w-2xl text-base font-medium leading-relaxed">
          A comprehensive, immutable ledger of all administrative actions and system modifications.
        </p>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <FilterDropdown
          label="Period"
          value={period}
          options={[
            { value: 'today', label: 'Today' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: 'all', label: 'All Time' },
          ]}
          onChange={setPeriod}
        />
        <FilterDropdown
          label="Action"
          value={actionFilter}
          options={[
            { value: '', label: 'All Activities' },
            ...actionTypes.map((a) => ({ value: a, label: a.replace(/_/g, ' ') })),
          ]}
          onChange={setActionFilter}
        />
        <FilterDropdown
          label="Event"
          value={eventFilter}
          options={[
            { value: '', label: 'System-Wide' },
            ...eventOptions.map(([id, title]) => ({ value: id, label: title })),
          ]}
          onChange={setEventFilter}
        />
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="bg-white border border-outline-variant/15 hover:bg-primary hover:text-white transition-all font-semibold rounded-full px-5 py-2.5 text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshIcon className="w-4 h-4" />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white/60 rounded-lg p-6 animate-pulse flex items-center gap-6">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-surface-container-high/50 rounded" />
                <div className="h-3 w-64 bg-surface-container-high/50 rounded" />
              </div>
              <div className="h-3 w-16 bg-surface-container-high/50 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-surface-container-high/40 flex items-center justify-center text-outline">
            <EmptyIcon />
          </div>
          <p className="text-on-surface/60 font-medium">No audit log entries found for the selected filters.</p>
        </div>
      )}

      {/* Log entries grouped by date */}
      {!loading && groups.length > 0 && (
        <div className="space-y-10">
          {groups.map(([key, entries]) => (
            <div key={key} className="space-y-4">
              {/* Date group header */}
              <div className="flex items-center gap-4">
                <h3 className="text-xs font-label font-bold text-outline uppercase tracking-widest whitespace-nowrap">
                  {formatGroupLabel(key, entries[0].createdAt)}
                </h3>
                <div className="h-px w-full bg-outline-variant/30" />
              </div>

              {/* Entries */}
              <div className="space-y-3">
                {entries.map((log) => {
                  const style = ACTION_STYLES[log.action] || DEFAULT_STYLE
                  const actorName = log.actor?.name || 'System'
                  const actorInitial = actorName.charAt(0).toUpperCase()

                  return (
                    <div
                      key={log.id}
                      className="bg-white p-5 rounded-lg hover:scale-[1.005] transition-all duration-300 flex items-center gap-5 shadow-sm border border-white/40"
                    >
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-lg ${style.bg} flex items-center justify-center ${style.color} shrink-0`}>
                        {style.icon}
                      </div>

                      {/* Content grid */}
                      <div className="flex-1 grid grid-cols-12 gap-3 items-center min-w-0">
                        {/* Action badge */}
                        <div className="col-span-3 min-w-0">
                          <h4 className={`font-headline font-bold text-sm ${style.color} truncate`}>
                            {log.action}
                          </h4>
                          <p className="text-[9px] font-label text-outline uppercase tracking-widest">
                            Action Type
                          </p>
                        </div>

                        {/* Actor */}
                        <div className="col-span-2 flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-xs shrink-0 border border-white shadow-sm">
                            {actorInitial}
                          </div>
                          <span className="font-headline font-semibold text-sm truncate">
                            {actorName}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-medium text-on-surface/70 truncate">
                            {describeAction(log)}
                          </p>
                          {log.eventId && (
                            <p className="text-[10px] font-label text-outline truncate">
                              ID: {log.eventId.slice(0, 12)}...
                            </p>
                          )}
                        </div>

                        {/* Relative time */}
                        <div className="col-span-2 text-right">
                          <span className="text-sm font-label text-outline">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <footer className="flex items-center justify-between pt-8 border-t border-outline-variant/10">
          <p className="text-xs font-label text-outline font-bold uppercase tracking-widest">
            Showing {startIdx}-{endIdx} of {filtered.length.toLocaleString()} log entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-5 py-2 rounded-lg border border-outline-variant/30 text-outline font-headline font-bold text-sm hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-5 py-2 rounded-lg bg-primary text-white font-headline font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}

/* ── SVG Icons ── */

function PostAddIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function PublishIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  )
}

function UnpublishIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  )
}

function CancelIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ApproveIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function RejectIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function BlockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  )
}

function UnblockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function PaymentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function BroadcastIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  )
}

function DefaultIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function EmptyIcon() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-white border border-outline-variant/15 rounded-full px-5 py-2.5 flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors shadow-sm"
      >
        {label}: <span className="font-bold text-on-surface">{selected?.label ?? value}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-outline-variant/15 rounded-lg shadow-lg py-1 z-50 min-w-[180px] max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-container-low transition-colors ${
                opt.value === value ? 'font-bold text-primary bg-primary-fixed/10' : 'text-on-surface-variant'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
