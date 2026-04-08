'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RegistrationRow from '@/components/features/admin/RegistrationRow'

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Registration = any

export default function RegistrationsPage() {
  const { id } = useParams<{ id: string }>()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [filter, setFilter] = useState('ALL')

  async function load() {
    const params = new URLSearchParams({ eventId: id })
    if (filter !== 'ALL') params.set('status', filter)
    const res = await fetch(`/api/registrations?${params}`)
    const data = await res.json()
    setRegistrations(data.data ?? [])
  }

  useEffect(() => { load() }, [filter])

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
            {s}
          </button>
        ))}
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
            {registrations.map((r: Registration) => (
              <RegistrationRow key={r.id} {...r} onUpdate={load} />
            ))}
          </tbody>
        </table>
        {registrations.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No registrations found</p>
        )}
      </div>
    </div>
  )
}
