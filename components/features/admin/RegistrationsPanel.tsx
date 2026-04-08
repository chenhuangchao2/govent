'use client'

import { useEffect, useState, useMemo } from 'react'
import RegistrationRow from '@/components/features/admin/RegistrationRow'

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED', 'PENDING_PAYMENT', 'ATTENDED', 'NO_SHOW']

type Registration = {
  id: string
  name: string
  email: string
  department: string
  status: string
  createdAt: string
}

export default function RegistrationsPanel({ eventId }: { eventId: string }) {
  const [all, setAll] = useState<Registration[]>([])
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  async function load() {
    const res = await fetch(`/api/registrations?eventId=${eventId}`)
    const data = await res.json()
    setAll(data.data ?? [])
  }

  useEffect(() => { load() }, [eventId])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of all) c[r.status] = (c[r.status] || 0) + 1
    return c
  }, [all])

  const displayed = useMemo(() => {
    let result = filter === 'ALL' ? all : all.filter(r => r.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      )
    }
    return result
  }, [all, filter, search])

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="mb-4 w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => {
          const count = s === 'ALL' ? all.length : (counts[s] ?? 0)
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}>
              {s}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Participant', 'Department', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(r => (
              <RegistrationRow key={r.id} {...r} onUpdate={load} />
            ))}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No registrations found</p>
        )}
      </div>
    </div>
  )
}
