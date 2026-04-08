'use client'

import { useState } from 'react'
import StatusBadge from '@/components/features/StatusBadge'
import QrDisplay from '@/components/features/QrDisplay'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Registration = any

export default function MyRegistrationsPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/my-registrations?email=${encodeURIComponent(email)}`)
    const data = await res.json()
    setRegistrations(data.data ?? [])
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Registrations</h1>
      <form onSubmit={lookup} className="flex gap-2 mb-8">
        <input type="email" placeholder="Your work email" value={email}
          onChange={e => setEmail(e.target.value)} required
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'Look up'}
        </button>
      </form>

      {submitted && registrations.length === 0 && (
        <p className="text-gray-500">No registrations found for this email.</p>
      )}

      <div className="space-y-4">
        {registrations.map((r: Registration) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{r.event.title}</h3>
                <p className="text-sm text-gray-500">{new Date(r.event.startTime).toLocaleDateString('en-SG', { dateStyle: 'long' })}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            {r.status === 'WAITLISTED' && r.waitlistPosition && (
              <p className="text-sm text-blue-600">Waitlist position: #{r.waitlistPosition}</p>
            )}
            {r.status === 'APPROVED' && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Show this QR code at the entrance</p>
                <QrDisplay registrationId={r.id} />
              </div>
            )}
            {r.event.cpdHours > 0 && r.status === 'ATTENDED' && (
              <p className="text-sm text-green-700 mt-2">🎓 {r.event.cpdHours} CPD hours recorded</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
