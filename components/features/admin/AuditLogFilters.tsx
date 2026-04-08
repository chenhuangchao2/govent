'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  events: { id: string; title: string }[]
  actionTypes: string[]
  currentAction: string
  currentEventId: string
  currentPeriod: string
}

const PERIODS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
]

export default function AuditLogFilters({ events, actionTypes, currentAction, currentEventId, currentPeriod }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/admin/audit-log?${params.toString()}`)
  }

  const selectClass = "border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
  const hasFilters = currentAction || currentEventId || currentPeriod

  return (
    <div className="flex gap-3 mb-4 flex-wrap items-center">
      <select value={currentPeriod} onChange={e => update('period', e.target.value)} className={selectClass}>
        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <select value={currentAction} onChange={e => update('action', e.target.value)} className={selectClass}>
        <option value="">All Actions</option>
        {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={currentEventId} onChange={e => update('eventId', e.target.value)} className={selectClass}>
        <option value="">All Events</option>
        {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
      </select>
      {hasFilters && (
        <button
          onClick={() => router.push('/admin/audit-log')}
          className="text-sm text-gray-500 hover:text-gray-700 underline">
          Clear filters
        </button>
      )}
    </div>
  )
}
