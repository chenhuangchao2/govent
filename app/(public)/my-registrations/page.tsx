'use client'

import { useState } from 'react'
import StatusBadge from '@/components/features/StatusBadge'
import QrDisplay from '@/components/features/QrDisplay'

interface RegistrationEvent {
  title: string
  startTime: string
  venue: string
  venueHidden: boolean
  cpdHours: number
  isPaid: boolean
}

interface Registration {
  id: string
  status: string
  waitlistPosition: number | null
  stripeSessionId: string | null
  event: RegistrationEvent
}

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

  const totalCpdHours = registrations
    .filter(r => r.status === 'ATTENDED')
    .reduce((sum, r) => sum + (r.event.cpdHours ?? 0), 0)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Registrations</h1>

      <form onSubmit={lookup} className="flex gap-2 mb-8">
        <input
          type="email"
          placeholder="Your work email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Look up'}
        </button>
      </form>

      {submitted && totalCpdHours > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-green-700 text-lg">🎓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Total CPD Hours Earned</p>
            <p className="text-2xl font-bold text-green-700">{totalCpdHours.toFixed(1)}</p>
          </div>
        </div>
      )}

      {submitted && registrations.length === 0 && (
        <p className="text-gray-500">No registrations found for this email.</p>
      )}

      <div className="space-y-4">
        {registrations.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{r.event.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(r.event.startTime).toLocaleDateString('en-SG', { dateStyle: 'long' })}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>

            {r.status === 'PENDING_PAYMENT' && r.stripeSessionId && (
              <div className="mt-3">
                <a
                  href={`https://checkout.stripe.com/c/pay/${r.stripeSessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Pay Now →
                </a>
              </div>
            )}

            {r.status === 'APPROVED' && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Venue:</span>{' '}
                  {r.event.venueHidden ? 'Venue details to be confirmed' : r.event.venue}
                </p>
                <p className="text-xs text-gray-500">Show this QR code at the entrance</p>
                <QrDisplay registrationId={r.id} />
              </div>
            )}

            {r.status === 'WAITLISTED' && r.waitlistPosition != null && (
              <p className="text-sm text-blue-600 mt-2">Waitlist position: #{r.waitlistPosition}</p>
            )}

            {r.status === 'ATTENDED' && (
              <p className="text-sm text-green-700 mt-2 font-medium">
                ✓ Attended
                {r.event.cpdHours > 0 && ` · ${r.event.cpdHours} CPD hours earned`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
