'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserRow {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  createdAt: string | Date
  _count: { events: number }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Icons ──

function PersonAddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  )
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

// ── Dialog Backdrop ──

function DialogBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white/90 backdrop-blur-xl border border-outline-variant/20 shadow-2xl shadow-primary/10 rounded-lg w-full max-w-md mx-4 p-6">
        {children}
      </div>
    </div>
  )
}

// ── Add Admin Dialog ──

function AddAdminDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to create admin')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogBackdrop onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-on-surface font-headline">Add Administrator</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container-high/50 transition-colors">
          <XIcon className="w-5 h-5 text-outline" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="e.g. Jane Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="e.g. jane@agency.gov.sg"
          />
        </div>
        <div>
          <label className="block text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="Min. 6 characters"
          />
        </div>

        {error && (
          <p className="text-sm text-error font-medium bg-error-container/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high/50 transition-all border border-outline-variant/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-container shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  )
}

// ── Reset Password Dialog ──

function ResetPasswordDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: UserRow
  onClose: () => void
  onSuccess: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'reset-password', password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to reset password')
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogBackdrop onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-on-surface font-headline">Reset Password</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container-high/50 transition-colors">
          <XIcon className="w-5 h-5 text-outline" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-surface-container-low/50">
        <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold text-sm shrink-0">
          {getInitials(user.name)}
        </div>
        <div>
          <p className="font-semibold text-on-surface text-sm">{user.name}</p>
          <p className="text-xs text-on-surface-variant">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="Min. 6 characters"
          />
        </div>

        {error && (
          <p className="text-sm text-error font-medium bg-error-container/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high/50 transition-all border border-outline-variant/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-container shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  )
}

// ── Main Panel ──

export function AccountsPanel({
  users,
  currentUserId,
}: {
  users: UserRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)

  const superAdminCount = users.filter((u) => u.isSuperAdmin).length
  const adminCount = users.filter((u) => !u.isSuperAdmin).length

  function handleSuccess() {
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface font-headline mb-1">
            System Accounts
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            Manage administrative privileges and access control.
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm"
        >
          <PersonAddIcon className="w-5 h-5" />
          Add Administrator
        </button>
      </div>

      {/* Card */}
      <div className="bg-white/70 backdrop-blur-xl border border-outline-variant/15 shadow-lg shadow-primary/5 rounded-lg overflow-hidden">
        {/* Tabs / Counts */}
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-4 bg-surface-container-low/30">
          <span className="text-xs font-label font-bold text-primary px-3 py-1 bg-primary-fixed/40 rounded-full">
            SUPER ADMIN: {superAdminCount}
          </span>
          <span className="text-xs font-label font-bold text-outline px-3 py-1 bg-surface-container-high rounded-full">
            ADMIN: {adminCount}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low/50">
              <tr>
                <th className="px-6 py-4 text-xs font-label font-semibold tracking-widest uppercase text-outline">
                  Name
                </th>
                <th className="px-6 py-4 text-xs font-label font-semibold tracking-widest uppercase text-outline">
                  Role
                </th>
                <th className="px-6 py-4 text-xs font-label font-semibold tracking-widest uppercase text-outline text-center">
                  Events
                </th>
                <th className="px-6 py-4 text-xs font-label font-semibold tracking-widest uppercase text-outline">
                  Joined
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-white/40 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            user.isSuperAdmin
                              ? 'bg-primary-fixed text-primary'
                              : 'bg-secondary-fixed text-on-secondary-fixed'
                          }`}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-on-surface flex items-center gap-2">
                            <span className="truncate">{user.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-label font-bold text-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-on-surface-variant truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-5">
                      {user.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          <ShieldIcon className="w-3 h-3" />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface-variant">
                          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                          Admin
                        </span>
                      )}
                    </td>

                    {/* Events */}
                    <td className="px-6 py-5 text-center font-semibold text-on-surface">
                      {user._count.events}
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-5 text-sm text-on-surface-variant font-label">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5 text-right">
                      {!isCurrentUser && (
                        <button
                          onClick={() => setResetTarget(user)}
                          title="Reset password"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-outline hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary-fixed/20"
                        >
                          <KeyIcon className="w-4 h-4" />
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    No admin accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {showAddDialog && (
        <AddAdminDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={handleSuccess}
        />
      )}
      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
