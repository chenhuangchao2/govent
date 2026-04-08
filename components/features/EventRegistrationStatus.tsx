'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from './StatusBadge'

interface Props {
  eventId: string
  isFull: boolean
  isPastDeadline: boolean
}

export default function EventRegistrationStatus({ eventId, isFull, isPastDeadline }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    fetch('/api/auth/participant/me')
      .then(res => res.json())
      .then(json => {
        if (!json.data?.email) {
          setChecking(false)
          return
        }
        setIsLoggedIn(true)
        return fetch(`/api/my-registrations?email=${encodeURIComponent(json.data.email)}`)
          .then(res => res.json())
          .then(regJson => {
            const regs = regJson.data ?? []
            const match = regs.find((r: { event: { id: string }; status: string }) => r.event.id === eventId)
            if (match) setStatus(match.status)
          })
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [eventId])

  if (checking) return null

  // Cancelled or rejected — treat as not registered (can re-register)
  const canReRegister = status === 'CANCELLED' || status === 'REJECTED'

  // Already registered with active status — show status
  if (status && !canReRegister) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-blue-600 font-medium text-sm">You&apos;re registered</span>
          <StatusBadge status={status} />
        </div>
        <Link href="/my-registrations" className="text-sm text-blue-600 hover:underline font-medium">
          View details →
        </Link>
      </div>
    )
  }

  // Not registered — show CTA
  if (isPastDeadline) {
    return <p className="text-sm text-gray-500">Registration has closed.</p>
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/register/${eventId}`}
        className={`inline-block px-6 py-2.5 rounded-lg font-medium text-white ${
          isFull ? 'bg-gray-700 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isFull ? 'Join Waitlist →' : 'Register Now →'}
      </Link>
      {!isLoggedIn && (
        <span className="text-xs text-gray-400">
          <Link href={`/login?redirect=/register/${eventId}`} className="text-blue-600 hover:underline">Sign in</Link> for a faster experience
        </span>
      )}
    </div>
  )
}
