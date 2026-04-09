'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/participant/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-code', email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send recovery code.');
        return;
      }
      setStep(2);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/participant/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password.');
        return;
      }
      setSuccessMessage('Password reset successfully. Redirecting to sign in...');
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Background */}
      <div className="fixed inset-0 iridescent-bg -z-10" />
      <div className="accent-spot top-[-100px] right-[-100px]" />
      <div className="accent-spot bottom-[-100px] left-[-100px]" />

      <main className="flex-grow flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 overflow-hidden rounded-xl glass-panel">
          {/* Left: Form */}
          <div className="p-10 lg:p-16 flex flex-col justify-center bg-white/20">
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-8">
                <span className="text-lg font-black text-blue-900 tracking-tighter uppercase font-headline">
                  GovEvent
                </span>
              </div>
              <h1 className="font-headline text-5xl lg:text-6xl font-extrabold tracking-tight text-on-surface mb-4 leading-tight">
                {step === 1 ? 'Reset Password' : 'New Password'}
              </h1>
              <p className="text-on-surface-variant text-lg font-medium max-w-sm">
                {step === 1
                  ? "Enter your email and we'll send a recovery code."
                  : (
                    <>
                      Enter the code sent to{' '}
                      <span className="font-bold text-on-surface">{email}</span>{' '}
                      and your new password.
                    </>
                  )}
              </p>
            </div>

            {/* Success message */}
            {successMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-tertiary-fixed/20 border border-tertiary-fixed-dim/30">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-on-surface font-medium text-sm">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-error-container/40 border border-error/20">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-on-error-container font-medium text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleSendCode} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label
                    className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1"
                    htmlFor="email"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.gov"
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-8 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending Code...
                      </span>
                    ) : (
                      'Send Recovery Code'
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    <Link
                      href="/login"
                      className="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4"
                    >
                      Back to Sign In
                    </Link>
                  </div>
                </div>
              </form>
            )}

            {/* Step 2: Code + New Password */}
            {step === 2 && !successMessage && (
              <form onSubmit={handleReset} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label
                    className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1"
                    htmlFor="code"
                  >
                    Verification Code
                  </label>
                  <div className="relative group">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                      />
                    </svg>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium text-center text-2xl tracking-[0.5em]"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1"
                    htmlFor="newPassword"
                  >
                    New Password
                  </label>
                  <div className="relative group">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1"
                    htmlFor="confirmPassword"
                  >
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                      />
                    </svg>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-8 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Resetting...
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    <Link
                      href="/login"
                      className="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4"
                    >
                      Back to Sign In
                    </Link>
                  </div>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-16 flex items-center gap-4 text-xs font-label font-semibold text-outline tracking-widest uppercase">
              <span className="w-8 h-[1px] bg-outline-variant" />
              Account Recovery
              <span className="w-8 h-[1px] bg-outline-variant" />
            </div>
          </div>

          {/* Right: Decorative Image */}
          <div className="hidden lg:block relative overflow-hidden bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop"
              alt="Abstract architectural shot of a modern glass building"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent" />
            <div className="absolute bottom-16 left-16 right-16">
              <div className="glass-panel p-8 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-8 h-8 text-tertiary-fixed" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span className="text-white font-headline text-lg font-bold">Secure Recovery</span>
                </div>
                <p className="text-white/80 font-medium text-sm leading-relaxed mb-6">
                  Your account security is our priority. A one-time verification code will be sent to your registered email to verify your identity before resetting your password.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed border-2 border-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75" />
                      </svg>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-tertiary-fixed border-2 border-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" />
                      </svg>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed border-2 border-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    End-to-end encrypted
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
