'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge from './StatusBadge'

interface Props {
  eventId: string
  eventTitle: string
  allowedDomains: string[]
  isPaid: boolean
}

export default function RegistrationForm({ eventId, eventTitle, allowedDomains, isPaid }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', organisation: '', remarks: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: string; waitlistPosition?: number | null } | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Pre-fill from session if logged in
  useEffect(() => {
    fetch('/api/auth/participant/me')
      .then(res => res.json())
      .then(json => {
        if (json.data?.email) {
          setForm(f => ({ ...f, name: json.data.name, email: json.data.email }))
          setIsLoggedIn(true)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, ...form }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }
    setResult(data.data)
  }

  // Compute eligibility hint from email while typing
  function getEligibilityHint(): 'eligible' | 'ineligible' | null {
    if (allowedDomains.length === 0) return null
    const atIndex = form.email.indexOf('@')
    if (atIndex === -1) return null
    const domain = form.email.slice(atIndex + 1).toLowerCase().trim()
    if (!domain) return null
    const match = allowedDomains.some(d => d.toLowerCase() === domain)
    return match ? 'eligible' : 'ineligible'
  }

  const eligibilityHint = getEligibilityHint()

  if (result) {
    let nextStepsText: string
    if (result.status === 'WAITLISTED') {
      nextStepsText = `You're on the waitlist at position ${result.waitlistPosition ?? '—'}. We'll notify you by email if a spot opens up.`
    } else if (isPaid) {
      nextStepsText = "The organiser will review your registration. Once approved, you'll receive a payment link via email."
    } else {
      nextStepsText = "The organiser will review your registration. You'll receive an email notification when approved."
    }

    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3 text-green-600 font-bold">✓</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Registration Submitted!</h2>
        <div className="mb-4 flex justify-center">
          <StatusBadge status={result.status} />
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 text-left mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What happens next</p>
          <p className="text-sm text-gray-700">{nextStepsText}</p>
        </div>

        {isLoggedIn ? (
          <Link
            href="/my-registrations"
            className="block w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 text-center mb-3"
          >
            View My Registrations →
          </Link>
        ) : (
          <Link
            href="/signup"
            className="block w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 text-center mb-3"
          >
            Create Account to Track Registrations →
          </Link>
        )}
        <Link href="/events" className="text-sm text-blue-600 hover:underline">
          Browse more events →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email"
          className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoggedIn ? 'bg-gray-50 text-gray-500' : ''}`}
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          readOnly={isLoggedIn} required />
        {isLoggedIn && <p className="mt-1 text-xs text-gray-400">Email from your account</p>}
        {!isLoggedIn && eligibilityHint === 'eligible' && (
          <p className="mt-1 text-green-600 text-xs">✓ Eligible</p>
        )}
        {!isLoggedIn && eligibilityHint === 'ineligible' && (
          <p className="mt-1 text-amber-600 text-xs">⚠ This domain may not be eligible</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.organisation} onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
        <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit Registration'}
      </button>
      {!isLoggedIn && (
        <p className="text-center text-xs text-gray-400">
          <Link href={`/login?redirect=/register/${eventId}`} className="text-blue-600 hover:underline">Sign in</Link> to pre-fill your details
        </p>
      )}
    </form>
  )
}
