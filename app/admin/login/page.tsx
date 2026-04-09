'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRecoveryHint, setShowRecoveryHint] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const json = await res.json()

      if (json.error) {
        setError(json.error)
        setLoading(false)
        return
      }

      router.push('/admin')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-body text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Background */}
      <div className="fixed inset-0 iridescent-bg -z-10" />
      <div className="accent-spot top-[-100px] right-[-100px]" />
      <div className="accent-spot bottom-[-100px] left-[-100px]" />

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 overflow-hidden rounded-xl glass-panel">
          {/* ── Left: Form ── */}
          <div className="p-10 lg:p-16 flex flex-col justify-center bg-white/40">
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-8">
                <span className="text-lg font-black text-blue-900 tracking-tighter uppercase font-headline">
                  GovEvent
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                {/* Shield icon (admin_panel_settings equivalent) */}
                <svg
                  className="w-8 h-8 text-primary flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                <h1 className="font-headline text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-tight">
                  Admin Console
                </h1>
              </div>

              <p className="text-on-surface-variant text-lg font-medium max-w-sm">
                Secure terminal for departmental oversight and protocol management.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-lg bg-error-container/60 text-on-error-container text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1"
                >
                  Administrative ID / Email
                </label>
                <div className="relative group">
                  {/* @ icon */}
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gov.sg"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label
                    htmlFor="password"
                    className="font-label text-sm font-semibold tracking-wide text-on-surface-variant"
                  >
                    Security Protocol
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryHint((v) => !v)}
                    className="font-label text-xs font-semibold text-primary hover:text-primary-container transition-colors cursor-pointer"
                  >
                    Recovery Mode
                  </button>
                </div>
                <div className="relative group">
                  {/* Key icon */}
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                  </svg>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium"
                  />
                </div>
                {showRecoveryHint && (
                  <p className="ml-1 text-xs text-on-surface-variant font-label">
                    Forgot password? Contact your system administrator.
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-4 flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-8 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    'Authenticate Node'
                  )}
                </button>
              </div>
            </form>

            {/* Footer link */}
            <div className="mt-12">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 text-on-surface-variant font-label text-sm font-medium hover:text-primary transition-all duration-300"
              >
                <svg
                  className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
                Return to Public Portal
              </Link>
            </div>
          </div>

          {/* ── Right: Image + Quote ── */}
          <div className="hidden lg:block relative overflow-hidden bg-slate-900">
            <img
              className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-luminosity"
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
              alt="Futuristic command center with deep blue data streams"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-transparent" />

            <div className="absolute bottom-16 left-16 right-16">
              <div className="glass-panel p-8 rounded-lg">
                <div className="flex items-center gap-2 mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-tertiary-fixed animate-pulse" />
                  <span className="text-white/80 text-xs font-bold uppercase tracking-widest">
                    System Integrity: Optimal
                  </span>
                </div>
                <p className="text-white font-headline text-xl font-bold italic mb-6 leading-relaxed">
                  &ldquo;The integrity of the state rests upon the precision of its
                  administration. We safeguard the future through unyielding
                  vigilance.&rdquo;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-white/20 overflow-hidden flex items-center justify-center">
                    {/* Avatar placeholder */}
                    <svg className="w-6 h-6 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Director Elias Vance</p>
                    <p className="text-white/60 text-xs font-medium uppercase tracking-tighter">
                      Department of Innovation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto space-y-4 md:space-y-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 font-label text-sm tracking-wide">
            GovEvent
          </span>
          <span className="text-slate-500 font-label text-sm">|</span>
          <span className="text-slate-500 font-label text-sm tracking-wide">
            &copy; 2026 The Ethereal State. All rights reserved.
          </span>
        </div>
        <div className="flex gap-8">
          <span className="text-slate-500 font-label text-sm tracking-wide">Privacy Policy</span>
          <span className="text-slate-500 font-label text-sm tracking-wide">Terms of Service</span>
        </div>
      </footer>
    </div>
  )
}
