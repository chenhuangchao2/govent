'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/features/StatusBadge'
import QrDisplay from '@/components/features/QrDisplay'
import SelfCancelButton from '@/components/features/SelfCancelButton'

interface RegistrationEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  venue: string
  cpdHours: number
  isPaid: boolean
}

interface Registration {
  id: string
  status: string
  waitlistPosition: number | null
  stripeSessionId: string | null
  paymentDeadline: string | null
  event: RegistrationEvent
}

export default function MyRegistrationsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  const fetchRegistrations = useCallback(async () => {
    const res = await fetch('/api/my-registrations')
    const data = await res.json()
    if (res.ok) setRegistrations(data.data ?? [])
  }, [])

  useEffect(() => {
    fetch('/api/auth/participant/me')
      .then(res => res.json())
      .then(async json => {
        if (json.data?.email) {
          setEmail(json.data.email)
          setUserName(json.data.name)
          await fetchRegistrations()
        }
        setAuthChecked(true)
        setLoading(false)
      })
      .catch(() => {
        setAuthChecked(true)
        setLoading(false)
      })
  }, [fetchRegistrations])

  const totalCpdHours = registrations
    .filter(r => r.status === 'ATTENDED')
    .reduce((sum, r) => sum + (r.event.cpdHours ?? 0), 0)

  const now = new Date()
  const upcoming = registrations.filter(r => new Date(r.event.startTime) >= now)
  const past = registrations.filter(r => new Date(r.event.startTime) < now)

  if (!authChecked || loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Registrations</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-32 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  // Not logged in — show login prompt
  if (!email) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Registrations</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600 mb-4">Sign in to view and manage your event registrations.</p>
          <Link href="/login?redirect=/my-registrations" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
            Sign In
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            Don&apos;t have an account? <Link href="/signup" className="text-blue-600 hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Registrations</h1>


      {totalCpdHours > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-green-700 text-lg">🎓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Total CPD Hours Earned</p>
            <p className="text-2xl font-bold text-green-700">{totalCpdHours.toFixed(1)}</p>
          </div>
        </div>
      )}

      {registrations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No registrations yet.</p>
          <Link href="/events" className="text-sm text-blue-600 hover:underline">Browse events →</Link>
        </div>
      )}

      {registrations.length > 0 && (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="space-y-4">
                {upcoming.map(r => <RegistrationCard key={r.id} r={r} email={email} setRegistrations={setRegistrations} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-4">
                {past.map(r => <RegistrationCard key={r.id} r={r} email={email} setRegistrations={setRegistrations} />)}
              </div>
            </div>
          )}
          <div className="mt-8 text-center">
            <Link href="/events" className="text-sm text-blue-600 hover:underline">Browse more events →</Link>
          </div>
        </>
      )}
    </div>
  )
}

function RegistrationCard({ r, email, setRegistrations }: {
  r: Registration
  email: string
  setRegistrations: React.Dispatch<React.SetStateAction<Registration[]>>
}) {
  const start = new Date(r.event.startTime)
  const end = new Date(r.event.endTime)
  const dateLabel = start.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeLabel = `${start.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true })}`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <Link href={`/events/${r.event.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {r.event.title}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{dateLabel}</span>
            <span className="text-gray-300">|</span>
            <span>{timeLabel}</span>
          </div>
        </div>
        <StatusBadge status={r.status} />
      </div>

      {r.status === 'APPROVED' && (
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-medium">Venue:</span> {r.event.venue || 'To Be Confirmed'}
        </p>
      )}

      {r.status === 'PENDING_PAYMENT' && r.stripeSessionId && (
        <div className="mt-2 mb-3">
          <a href={r.stripeSessionId} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Pay Now →
          </a>
          {r.paymentDeadline && (
            <p className="text-xs text-gray-500 mt-1">
              Payment due by {new Date(r.paymentDeadline).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      )}

      {r.status === 'APPROVED' && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-gray-500">Show this QR code at the entrance</p>
          <QrDisplay registrationId={r.id} eventTitle={r.event.title} />
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

      {r.status === 'CANCELLED' && (
        <p className="text-sm text-gray-400 mt-2">This registration has been cancelled.</p>
      )}

      <SelfCancelButton
        registrationId={r.id}
        email={email}
        status={r.status}
        onCancel={() => {
          setRegistrations(prev => prev.map(reg =>
            reg.id === r.id ? { ...reg, status: 'CANCELLED' } : reg
          ))
        }}
      />
    </div>
  )
}
