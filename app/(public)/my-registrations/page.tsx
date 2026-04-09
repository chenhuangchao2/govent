'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RegistrationEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  venue: string | null
  cpdHours: number | null
  isPaid: boolean
  imageUrl?: string | null
}

interface Registration {
  id: string
  name: string
  email: string
  status: string
  stripeSessionId: string | null
  paymentDeadline: string | null
  waitlistPosition: number | null
  checkedInAt: string | null
  event: RegistrationEvent
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' \u2022 ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function deadlineLabel(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 48) return `In ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `In ${days} day${days === 1 ? '' : 's'}`
}

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=500'

const PAST_STATUSES = ['ATTENDED', 'NO_SHOW', 'CANCELLED', 'REJECTED']

/* ------------------------------------------------------------------ */
/*  SVG Icons (inline, no external deps)                               */
/* ------------------------------------------------------------------ */

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function MapPinIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function QrCodeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" />
      <path d="M14 14h2v2h-2z" /><path d="M20 14h2v2h-2z" /><path d="M14 20h2v2h-2z" /><path d="M20 20h2v2h-2z" /><path d="M17 17h2v2h-2z" />
    </svg>
  )
}

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CheckCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function AwardIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  )
}

function BookOpenIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function PlusCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function ShieldCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function PrinterIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function AlertTriangleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status, waitlistPosition }: { status: string; waitlistPosition?: number | null }) {
  switch (status) {
    case 'APPROVED':
      return (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-primary flex items-center gap-1 shadow-sm uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Approved
        </div>
      )
    case 'PENDING':
      return (
        <div className="absolute top-4 left-4 bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm uppercase tracking-wider">
          Pending
        </div>
      )
    case 'PENDING_PAYMENT':
      return (
        <div className="absolute top-4 left-4 bg-secondary-container text-on-secondary-fixed px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm uppercase tracking-wider">
          Pending Payment
        </div>
      )
    case 'WAITLISTED':
      return (
        <>
          <div className="absolute top-4 left-4 bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm uppercase tracking-wider">
            Waitlisted
          </div>
          {waitlistPosition != null && (
            <div className="absolute top-4 right-4 bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full text-[10px] font-bold">
              Position #{waitlistPosition}
            </div>
          )}
        </>
      )
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/*  QR Modal                                                           */
/* ------------------------------------------------------------------ */

function QrModal({ registration, onClose }: { registration: Registration; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(registration.id, { width: 300, margin: 2 }).then(setQrDataUrl)
    })
  }, [registration.id])

  const qrUrl = qrDataUrl || ''

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html><head><title>Entry Pass - ${registration.event.title}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        h2 { margin-bottom: 4px; }
        p { color: #666; margin: 4px 0; }
        img { margin: 24px auto; }
        .id { font-size: 11px; color: #999; margin-top: 16px; word-break: break-all; }
      </style></head><body>
      <h2>${registration.event.title}</h2>
      <p>${formatDate(registration.event.startTime)}</p>
      <p>${registration.event.venue || 'TBC'}</p>
      <img src="${qrUrl}" width="260" height="260" />
      <p><strong>${registration.name}</strong></p>
      <p class="id">ID: ${registration.id}</p>
      </body></html>
    `)
    w.document.close()
    w.onload = () => { w.print() }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-on-background/40 backdrop-blur-md" />
      <div
        className="relative glass-card max-w-md w-full p-8 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-error transition-colors">
          <XIcon className="w-5 h-5" />
        </button>
        <h4 className="text-2xl font-bold font-headline mb-1 text-center">Entry Pass</h4>
        <p className="text-on-surface-variant text-sm text-center mb-6">{registration.event.title}</p>
        <div className="flex justify-center mb-6">
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrDataUrl} alt="QR Code" width={260} height={260} className="rounded-lg" />
          ) : (
            <div className="w-[260px] h-[260px] bg-surface-container rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-outline text-sm">Generating QR...</span>
            </div>
          )}
        </div>
        <p className="text-center font-bold text-lg">{registration.name}</p>
        <p className="text-center text-on-surface-variant text-xs mt-1 break-all">ID: {registration.id}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-grow flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-full hover:opacity-90 transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            Print Pass
          </button>
          <button
            onClick={onClose}
            className="flex-grow py-3 border border-outline-variant font-bold rounded-full hover:bg-surface-container-low transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Cancel Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function CancelModal({ registration, userEmail, onClose, onCancelled }: {
  registration: Registration
  userEmail: string
  onClose: () => void
  onCancelled: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/registrations/self-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: registration.id, email: userEmail }),
      })
      const json = await res.json()
      if (res.ok && !json.error) {
        onCancelled()
      } else {
        alert(json.error || 'Failed to cancel')
      }
    } catch {
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-on-background/40 backdrop-blur-md" />
      <div
        className="relative glass-card max-w-md w-full p-8 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-2xl font-bold font-headline mb-4">Cancel Registration?</h4>
        <p className="text-on-surface-variant mb-8 leading-relaxed">
          Are you sure you want to cancel your registration for <strong>{registration.event.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-grow py-3 bg-error text-white font-bold rounded-full hover:bg-error/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
          <button
            onClick={onClose}
            className="flex-grow py-3 border border-outline-variant font-bold rounded-full hover:bg-surface-container-low transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Upcoming Registration Card                                         */
/* ------------------------------------------------------------------ */

function UpcomingCard({ reg, userEmail, onViewQr, onCancel }: {
  reg: Registration
  userEmail: string
  onViewQr: (r: Registration) => void
  onCancel: (r: Registration) => void
}) {
  const imgSrc = reg.event.imageUrl || PLACEHOLDER_IMG
  const isWaitlisted = reg.status === 'WAITLISTED'

  return (
    <div className={`glass-card rounded-xl overflow-hidden group transition-all duration-300 hover:scale-[1.02] flex flex-col ${reg.status === 'PENDING_PAYMENT' ? 'border-secondary-container/30 border' : ''}`}>
      {/* Image */}
      <div className={`h-48 overflow-hidden relative ${isWaitlisted ? 'opacity-70 grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="w-full h-full object-cover" src={imgSrc} alt={reg.event.title} />
        <StatusBadge status={reg.status} waitlistPosition={reg.waitlistPosition} />
        {/* Payment deadline bar */}
        {reg.status === 'PENDING_PAYMENT' && reg.paymentDeadline && (
          <div className="absolute bottom-0 left-0 right-0 bg-error/90 backdrop-blur-md py-2 px-4 text-white text-[10px] font-bold flex items-center gap-2">
            <AlertTriangleIcon className="w-3 h-3" />
            Deadline: {deadlineLabel(reg.paymentDeadline)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{reg.event.title}</h3>
        <div className="space-y-3 mb-6 text-on-surface-variant text-sm font-medium">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-[18px] h-[18px] text-primary shrink-0" />
            <span>{formatDate(reg.event.startTime)}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPinIcon className="w-[18px] h-[18px] text-primary shrink-0" />
            <span>{reg.event.venue || 'TBC'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
          {reg.status === 'APPROVED' && (
            <button
              onClick={() => onViewQr(reg)}
              className="bg-primary-fixed text-primary px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-primary hover:text-white transition-all"
            >
              <QrCodeIcon className="w-[18px] h-[18px]" />
              View Entry Pass
            </button>
          )}
          {reg.status === 'PENDING_PAYMENT' && reg.stripeSessionId && (
            <a
              href={reg.stripeSessionId}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center"
            >
              Pay Now
            </a>
          )}
          {reg.status === 'PENDING_PAYMENT' && !reg.stripeSessionId && (
            <span className="text-on-surface-variant text-xs italic">Payment link expired</span>
          )}
          {reg.status === 'WAITLISTED' && (
            <span className="text-on-surface-variant text-xs italic">Auto-notifying if spot opens</span>
          )}
          {reg.status === 'PENDING' && (
            <span className="text-on-surface-variant text-xs italic">Awaiting review</span>
          )}

          <button
            onClick={() => onCancel(reg)}
            className="text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <XIcon className="w-[18px] h-[18px]" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Past Registration Card                                             */
/* ------------------------------------------------------------------ */

function PastCard({ reg }: { reg: Registration }) {
  const isAttended = reg.status === 'ATTENDED'
  const completedDate = reg.event.endTime
    ? new Date(reg.event.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className={`glass-card rounded-xl overflow-hidden transition-all duration-300 ${isAttended ? 'opacity-80 hover:opacity-100' : 'opacity-60'}`}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-lg ${isAttended ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div className={`flex items-center gap-1 font-bold text-xs ${isAttended ? 'text-primary-container' : 'text-on-surface-variant'}`}>
            {isAttended ? (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Attended
              </>
            ) : (
              <span className="capitalize">{reg.status.replace('_', ' ').toLowerCase()}</span>
            )}
          </div>
        </div>
        <h3 className="text-lg font-bold mb-2">{reg.event.title}</h3>
        <p className="text-on-surface-variant text-sm font-medium mb-6">
          {isAttended ? `Completed on ${completedDate}` : `${reg.status.replace('_', ' ')} \u2022 ${completedDate}`}
        </p>
        {isAttended && reg.event.cpdHours != null && reg.event.cpdHours > 0 && (
          <div className="bg-primary-fixed/30 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AwardIcon className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm text-primary">CPD Points Earned</span>
            </div>
            <span className="text-lg font-extrabold text-primary">{reg.event.cpdHours}</span>
          </div>
        )}
        {isAttended && (
          <div className="mt-4 pt-4 border-t border-outline-variant/10">
            <a
              href={`/certificate/${reg.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary-fixed text-primary px-4 py-2 rounded-full text-sm font-bold hover:bg-primary hover:text-white transition-all"
            >
              <AwardIcon className="w-4 h-4" />
              View Certificate
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <main className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto relative">
      <div className="glass-card p-10 rounded-xl animate-pulse mb-16">
        <div className="h-10 bg-surface-container-high rounded w-1/3 mb-4" />
        <div className="h-4 bg-surface-container-high rounded w-2/3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
            <div className="h-48 bg-surface-container-high" />
            <div className="p-6 space-y-3">
              <div className="h-5 bg-surface-container-high rounded w-3/4" />
              <div className="h-4 bg-surface-container-high rounded w-1/2" />
              <div className="h-4 bg-surface-container-high rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/*  Not Logged In State                                                */
/* ------------------------------------------------------------------ */

function NotLoggedIn() {
  return (
    <main className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
      <div className="glass-card p-12 rounded-xl text-center max-w-md w-full">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-fixed/30 flex items-center justify-center">
          <ShieldCheckIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-extrabold font-headline mb-3">Sign in to continue</h2>
        <p className="text-on-surface-variant mb-8">Sign in to view your registrations and track your professional development progress.</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login?redirect=/my-registrations"
            className="w-full py-3 bg-primary text-white font-bold rounded-full hover:opacity-90 transition-colors text-center"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="w-full py-3 border border-outline-variant font-bold rounded-full hover:bg-surface-container-low transition-colors text-center"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function MyRegistrationsPage() {
  const [user, setUser] = useState<{ name: string; email: string; organisation?: string } | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [qrReg, setQrReg] = useState<Registration | null>(null)
  const [cancelReg, setCancelReg] = useState<Registration | null>(null)

  // Check auth
  useEffect(() => {
    fetch('/api/auth/participant/me')
      .then((r) => {
        if (!r.ok) throw new Error('not authed')
        return r.json()
      })
      .then((d) => {
        if (d?.data) setUser(d.data)
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, [])

  // Fetch registrations
  const fetchRegistrations = useCallback(async () => {
    try {
      const res = await fetch('/api/my-registrations')
      if (!res.ok) return
      const json = await res.json()
      if (json.data) setRegistrations(json.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchRegistrations()
  }, [user, fetchRegistrations])

  // -- Derived data
  const now = new Date()
  const upcoming = registrations.filter(
    (r) => new Date(r.event.startTime) > now && !PAST_STATUSES.includes(r.status)
  )
  const past = registrations.filter(
    (r) => new Date(r.event.startTime) <= now || PAST_STATUSES.includes(r.status)
  )
  const cpdTotal = registrations
    .filter((r) => r.status === 'ATTENDED')
    .reduce((sum, r) => sum + (r.event.cpdHours || 0), 0)

  // -- Auth gate
  if (!authChecked) return <Skeleton />
  if (!user) return <NotLoggedIn />
  if (loading) return <Skeleton />

  return (
    <>
      <main className="pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto relative">
        {/* Ambient glow */}
        <div className="state-glow w-[300px] h-[300px] top-0 right-0" />
        <div className="state-glow w-[300px] h-[300px] bottom-0 left-0" />

        {/* ── Header ── */}
        <header className="mb-16">
          <div className="glass-card p-10 rounded-xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-tertiary-fixed to-secondary" />
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter mb-4 text-primary">
                My Registrations
              </h1>
              <p className="text-on-surface-variant font-medium leading-relaxed">
                Manage your upcoming engagements and track your professional development progress.
              </p>
            </div>
            <div className="bg-surface-container-lowest/50 rounded-lg p-8 text-center min-w-[240px] shadow-sm border border-outline-variant/10">
              <span className="block text-[11px] font-label uppercase tracking-[0.2em] text-on-surface-variant mb-2">
                CPD Hours Summary
              </span>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-6xl font-extrabold font-headline text-primary tracking-tighter">{cpdTotal}</span>
                <span className="text-lg font-bold text-on-surface-variant">HRS</span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-primary font-bold text-sm">
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Total Earned</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Upcoming Events ── */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-extrabold font-headline tracking-tight">Upcoming Events</h2>
            <div className="h-[2px] flex-grow bg-gradient-to-r from-outline-variant/30 to-transparent" />
          </div>

          {upcoming.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Link
                href="/events"
                className="border-2 border-dashed border-outline-variant/30 rounded-xl flex flex-col items-center justify-center p-8 text-center hover:bg-surface-container-low transition-colors group cursor-pointer min-h-[280px]"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary-fixed transition-colors">
                  <PlusCircleIcon className="w-6 h-6 text-on-surface-variant group-hover:text-primary" />
                </div>
                <p className="font-bold text-on-surface-variant">Register for New Events</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">Discover more opportunities to earn CPD hours</p>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcoming.map((reg) => (
                <UpcomingCard
                  key={reg.id}
                  reg={reg}
                  userEmail={user.email}
                  onViewQr={setQrReg}
                  onCancel={setCancelReg}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Past Events ── */}
        {past.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-2xl font-extrabold font-headline tracking-tight">Past Events</h2>
              <div className="h-[2px] flex-grow bg-gradient-to-r from-outline-variant/30 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {past.map((reg) => (
                <PastCard key={reg.id} reg={reg} />
              ))}
              {/* Browse more card */}
              <Link
                href="/events"
                className="border-2 border-dashed border-outline-variant/30 rounded-xl flex flex-col items-center justify-center p-8 text-center hover:bg-surface-container-low transition-colors group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary-fixed transition-colors">
                  <PlusCircleIcon className="w-6 h-6 text-on-surface-variant group-hover:text-primary" />
                </div>
                <p className="font-bold text-on-surface-variant">Register for New Events</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">Discover more opportunities to earn CPD hours</p>
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* ── QR Modal ── */}
      {qrReg && <QrModal registration={qrReg} onClose={() => setQrReg(null)} />}

      {/* ── Cancel Modal ── */}
      {cancelReg && (
        <CancelModal
          registration={cancelReg}
          userEmail={user.email}
          onClose={() => setCancelReg(null)}
          onCancelled={() => {
            setCancelReg(null)
            fetchRegistrations()
          }}
        />
      )}
    </>
  )
}
