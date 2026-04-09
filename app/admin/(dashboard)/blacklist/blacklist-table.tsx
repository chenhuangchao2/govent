'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface BlacklistEntry {
  id: string
  email: string
  reason: string
  source: 'MANUAL' | 'AUTO_NO_SHOW' | 'AUTO_PAYMENT'
  noShowCount: number
  isActive: boolean
  addedAt: string
  removedAt: string | null
}

const SOURCE_OPTIONS = ['All', 'AUTO_NO_SHOW', 'AUTO_PAYMENT', 'MANUAL'] as const

const SOURCE_BADGE: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  AUTO_NO_SHOW: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-100' },
  AUTO_PAYMENT: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-100' },
  MANUAL: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200' },
}

const INCIDENT_BAR_COLOR: Record<string, string> = {
  AUTO_NO_SHOW: 'bg-red-400',
  AUTO_PAYMENT: 'bg-amber-400',
  MANUAL: 'bg-slate-400',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ---- SVG Icons (inline, no external deps) ---- */
function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}
function BlockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" strokeLinecap="round" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---- Confirmation Modal ---- */
function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <AlertIcon />
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 mb-8">{description}</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3.5 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-3.5 rounded-lg font-bold text-sm bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---- Add Modal ---- */
function AddModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const reset = () => {
    setEmail('')
    setReason('')
    setError('')
    setShowConfirm(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !reason.trim()) {
      setError('Email and reason are required.')
      return
    }
    setError('')
    setShowConfirm(true)
  }

  const handleConfirmAdd = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), reason: reason.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to add entry.')
        setShowConfirm(false)
        setLoading(false)
        return
      }
      reset()
      onClose()
      onAdded()
    } catch {
      setError('Network error.')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-lg rounded-3xl p-10 relative shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Add to Blacklist</h3>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <XIcon />
            </button>
          </div>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmitClick} className="space-y-6">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em] mb-2">
                User Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. name@company.com"
                className="w-full px-6 py-4 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em] mb-2">
                Block Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a detailed explanation for this restriction..."
                rows={3}
                className="w-full px-6 py-4 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-sm font-medium resize-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-4 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-4 rounded-lg font-bold text-sm bg-gradient-to-r from-primary to-primary-container text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Restrict User
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Confirm Blacklist Addition"
        description={`Are you sure you want to blacklist "${email}"? This will block them from all future event registrations.`}
        confirmLabel="Confirm Block"
        onConfirm={handleConfirmAdd}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  )
}

/* ---- Main Table Component ---- */
export default function BlacklistTable({ entries: initialEntries }: { entries: BlacklistEntry[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('All')
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<BlacklistEntry | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const refresh = useCallback(() => router.refresh(), [router])

  /* Filter logic */
  const filtered = initialEntries.filter((e) => {
    if (!e.isActive) return false
    if (search && !e.email.toLowerCase().includes(search.toLowerCase())) return false
    if (sourceFilter !== 'All' && e.source !== sourceFilter) return false
    return true
  })

  /* Remove handler */
  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      const res = await fetch(`/api/blacklist/${removeTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setRemoveTarget(null)
        refresh()
      }
    } catch {
      // silent
    } finally {
      setRemoveLoading(false)
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-1">Blacklist Management</h1>
          <p className="text-slate-500 font-medium text-sm">
            Enforce system-wide restrictions and monitor automated security flags.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-white px-7 py-3.5 rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
        >
          <BlockIcon />
          Add to Blacklist
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg p-6 border border-white/40 shadow-sm mb-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email address..."
              className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full lg:w-52 px-4 py-3.5 bg-surface-container-low border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20"
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'All' ? 'Source: All' : opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden relative border border-white/40 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="px-8 py-5 text-[10px] font-label font-bold tracking-[0.2em] text-slate-400 uppercase">
                  Target Entity
                </th>
                <th className="px-8 py-5 text-[10px] font-label font-bold tracking-[0.2em] text-slate-400 uppercase">
                  Reason for Block
                </th>
                <th className="px-8 py-5 text-[10px] font-label font-bold tracking-[0.2em] text-slate-400 uppercase">
                  Origin Source
                </th>
                <th className="px-8 py-5 text-[10px] font-label font-bold tracking-[0.2em] text-slate-400 uppercase">
                  Incidents
                </th>
                <th className="px-8 py-5 text-[10px] font-label font-bold tracking-[0.2em] text-slate-400 uppercase">
                  Added On
                </th>
                <th className="px-8 py-5 text-[10px] font-label font-bold tracking-[0.2em] text-slate-400 uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-slate-400 text-sm font-medium">
                    {search || sourceFilter !== 'All'
                      ? 'No entries match your filters.'
                      : 'No blacklist entries yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((entry) => {
                const badge = SOURCE_BADGE[entry.source] || SOURCE_BADGE.MANUAL
                const barColor = INCIDENT_BAR_COLOR[entry.source] || 'bg-slate-400'
                const barWidth = Math.min((entry.noShowCount / 5) * 100, 100)

                return (
                  <tr key={entry.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-900">{entry.email}</span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm text-slate-600">{entry.reason}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 ${badge.bg} ${badge.text} text-[9px] font-extrabold rounded-full border ${badge.border} uppercase tracking-widest`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {entry.source}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-800">{entry.noShowCount}</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-medium text-slate-500">{formatDate(entry.addedAt)}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setRemoveTarget(entry)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove from blacklist"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Showing {filtered.length} of {initialEntries.filter((e) => e.isActive).length} entries
          </span>
        </div>
      </div>

      {/* Modals */}
      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} />
      <ConfirmModal
        open={!!removeTarget}
        title="Remove from Blacklist"
        description={
          removeTarget
            ? `Are you sure you want to remove "${removeTarget.email}" from the blacklist? They will be able to register for events again.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={removeLoading}
      />
    </>
  )
}
