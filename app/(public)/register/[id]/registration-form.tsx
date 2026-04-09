'use client'

import { useState, useEffect, useMemo } from 'react'

type Props = {
  eventId: string
  eventTitle: string
  isPaid: boolean
  price: number | null
  allowedDomains: string[]
  allowedOrganisations: string[]
}

type RegistrationResult = {
  id: string
  status: string
  waitlistPosition?: number | null
}

export function RegistrationForm({
  eventId,
  eventTitle,
  isPaid,
  price,
  allowedDomains,
  allowedOrganisations,
}: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RegistrationResult | null>(null)

  // Fetch participant session for pre-fill
  useEffect(() => {
    fetch('/api/auth/participant/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setName(data.data.name || '')
          setEmail(data.data.email || '')
          setOrganisation(data.data.organisation || '')
          setIsLoggedIn(true)
        }
      })
      .catch(() => {})
  }, [])

  // Real-time eligibility check
  const eligibility = useMemo(() => {
    if (allowedDomains.length === 0) return null
    if (!email || !email.includes('@')) return null
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) return null
    const match = allowedDomains.some(
      (d) => d.toLowerCase() === domain
    )
    return match ? 'eligible' : 'warning'
  }, [email, allowedDomains])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          organisation: organisation.trim(),
          remarks: remarks.trim() || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error || 'Registration failed. Please try again.')
        return
      }

      setResult(json.data)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Success screen
  if (result) {
    return (
      <section className="glass-panel p-12 rounded-lg shadow-2xl shadow-blue-900/10">
        <div className="text-center space-y-6">
          {/* Status icon */}
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-tertiary-container/20">
            {result.status === 'WAITLISTED' ? (
              <svg className="w-10 h-10 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface">
            Registration Submitted
          </h2>

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold font-label tracking-wide uppercase"
            style={{
              background:
                result.status === 'APPROVED'
                  ? 'rgba(0, 105, 119, 0.12)'
                  : result.status === 'WAITLISTED'
                    ? 'rgba(72, 88, 171, 0.12)'
                    : 'rgba(0, 71, 141, 0.12)',
              color:
                result.status === 'APPROVED'
                  ? 'var(--color-tertiary)'
                  : result.status === 'WAITLISTED'
                    ? 'var(--color-secondary)'
                    : 'var(--color-primary)',
            }}
          >
            {result.status === 'APPROVED' && 'Approved'}
            {result.status === 'PENDING' && 'Pending Review'}
            {result.status === 'WAITLISTED' && `Waitlisted (#${result.waitlistPosition || ''})`}
          </div>

          {/* What happens next */}
          <div className="text-on-surface-variant text-sm leading-relaxed max-w-md mx-auto space-y-2">
            {result.status === 'PENDING' && (
              <>
                <p>Your registration is being reviewed by the organiser.</p>
                <p>You will receive an email notification once your registration has been processed.</p>
              </>
            )}
            {result.status === 'APPROVED' && (
              <>
                <p>You are confirmed for <span className="font-semibold text-on-surface">{eventTitle}</span>.</p>
                {isPaid && price && (
                  <p>Please complete payment of <span className="font-semibold">SGD {price.toFixed(2)}</span> to secure your spot.</p>
                )}
                <p>Check your email for confirmation details.</p>
              </>
            )}
            {result.status === 'WAITLISTED' && (
              <>
                <p>The event is currently at full capacity. You have been placed on the waitlist.</p>
                <p>If a spot opens up, you will be notified by email automatically.</p>
              </>
            )}
          </div>

          {/* Action links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="/my-registrations"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3.5 rounded-full font-bold text-sm font-headline hover:scale-[0.98] transition-transform duration-300 shadow-lg shadow-primary/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              View My Registrations
            </a>
            <a
              href="/events"
              className="inline-flex items-center gap-2 text-primary font-bold text-sm font-headline hover:underline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Events
            </a>
          </div>

          {/* Signup CTA for guests */}
          {!isLoggedIn && (
            <div className="pt-4 border-t border-outline-variant/30 mt-6">
              <p className="text-xs text-outline font-label">
                <a href="/signup" className="text-primary font-semibold hover:underline">
                  Create an account
                </a>{' '}
                to track your registrations and earn CPD hours.
              </p>
            </div>
          )}
        </div>
      </section>
    )
  }

  // Registration form
  return (
    <section>
      <div className="glass-panel p-12 rounded-lg shadow-2xl shadow-blue-900/10">
        <div className="mb-10">
          <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface">
            Registration Details
          </h2>
          <p className="text-on-surface-variant mt-2 font-body">
            Secure your position at this event. Please complete the details below.
          </p>
        </div>

        {error && (
          <div className="mb-8 flex items-center gap-3 px-4 py-3 rounded-lg bg-error-container/20 border border-error-container/40">
            <svg className="w-5 h-5 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-semibold text-error font-label">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold tracking-wide font-label text-on-surface-variant uppercase ml-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-high/40 backdrop-blur-md rounded-lg px-6 py-4 focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline outline-none"
              placeholder="e.g. Jane Doe"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold tracking-wide font-label text-on-surface-variant uppercase ml-1">
              Work Email
            </label>
            <div className="relative group">
              {isLoggedIn ? (
                <>
                  <input
                    type="email"
                    required
                    readOnly
                    value={email}
                    className="w-full bg-surface-container-low/60 rounded-lg px-6 py-4 text-on-surface-variant cursor-not-allowed font-medium outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-primary/60">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  </div>
                </>
              ) : (
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-high/40 backdrop-blur-md rounded-lg px-6 py-4 focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline outline-none"
                  placeholder="you@agency.gov.sg"
                />
              )}
            </div>

            {/* Eligibility hint */}
            {eligibility === 'eligible' && (
              <div className="flex items-center gap-3 mt-3 px-4 py-3 rounded-lg bg-tertiary-container/10 border border-tertiary-container/20">
                <svg className="w-5 h-5 text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-tertiary font-label">
                  Government email detected — <span className="underline decoration-2">High Priority Eligibility</span>
                </p>
              </div>
            )}
            {eligibility === 'warning' && (
              <div className="flex items-center gap-3 mt-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200/40">
                <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-semibold text-amber-700 font-label">
                  This email domain may not be eligible for this event
                </p>
              </div>
            )}
          </div>

          {/* Organisation Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold tracking-wide font-label text-on-surface-variant uppercase ml-1">
              Organisation / Ministry
            </label>
            <input
              type="text"
              required
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              className="w-full bg-surface-container-high/40 backdrop-blur-md rounded-lg px-6 py-4 focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline outline-none"
              placeholder="e.g. GovTech Singapore"
            />
          </div>

          {/* Remarks Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold tracking-wide font-label text-on-surface-variant uppercase ml-1">
              Additional Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full bg-surface-container-high/40 backdrop-blur-md rounded-lg px-6 py-4 focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline outline-none resize-none"
              placeholder="Specific dietary requirements or accessibility needs..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-full font-extrabold text-lg tracking-tight font-headline shadow-lg shadow-primary/20 hover:scale-[0.98] transition-transform duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Complete Registration'
              )}
            </button>
            <p className="text-center text-xs text-outline mt-6 font-label uppercase tracking-widest leading-relaxed">
              By registering, you agree to the{' '}
              <a className="underline hover:text-primary" href="#">
                Terms of Service
              </a>
              .
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
