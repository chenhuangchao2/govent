'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(600); // 10 min in seconds

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  // Countdown timer for Step 2
  useEffect(() => {
    if (step !== 2) return;
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Step 1: Submit signup
  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/participant/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organisation, email, password }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setStep(2);
        setCountdown(600);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/participant/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        router.push('/my-registrations');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP
  async function handleResend() {
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/participant/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, organisation, email, password }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setCountdown(600);
      }
    } catch {
      setError('Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Background */}
      <div className="fixed inset-0 iridescent-bg -z-10" />
      <div className="accent-spot top-[-100px] right-[-100px] fixed" />
      <div className="accent-spot bottom-[-100px] left-[-100px] fixed" />

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 overflow-hidden rounded-xl glass-panel">
          {/* Left: Form */}
          <div className="p-8 lg:p-12 flex flex-col justify-center bg-white/20">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-lg font-black text-blue-900 tracking-tighter uppercase font-headline">
                  GovEvent
                </span>
              </div>

              {step === 1 ? (
                <>
                  <h1 className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2 leading-tight">
                    Create Account
                  </h1>
                  <p className="text-on-surface-variant text-sm font-medium max-w-sm">
                    Join the platform. Register for government events and workshops.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2 leading-tight">
                    Verify Email
                  </h1>
                  <p className="text-on-surface-variant text-sm font-medium max-w-sm">
                    Enter the 6-digit code sent to{' '}
                    <span className="font-bold text-on-surface">{email}</span>
                  </p>
                </>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-4 px-5 py-2 bg-error-container text-on-error-container rounded-full text-sm font-label font-semibold">
                {error}
              </div>
            )}

            {step === 1 ? (
              /* ─── Step 1: Signup Form ─── */
              <form onSubmit={handleSignup} className="space-y-3 relative z-10">
                {/* Name */}
                <div className="space-y-1">
                  <label htmlFor="name" className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Organisation */}
                <div className="space-y-1">
                  <label htmlFor="organisation" className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1">
                    Organisation
                  </label>
                  <div className="relative group">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <input
                      id="organisation"
                      type="text"
                      value={organisation}
                      onChange={(e) => setOrganisation(e.target.value)}
                      placeholder="Ministry of Technology"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="email" className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.gov"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label htmlFor="password" className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-1 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-8 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating Account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-on-surface-variant font-medium text-sm">Already have an account?</span>
                    <Link href="/login" className="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4">
                      Sign In
                    </Link>
                  </div>
                </div>
              </form>
            ) : (
              /* ─── Step 2: OTP Verification ─── */
              <form onSubmit={handleVerify} className="space-y-6 relative z-10">
                {/* OTP Input */}
                <div className="space-y-1">
                  <label htmlFor="otp" className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full py-4 px-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all text-center text-2xl tracking-[0.5em] font-mono placeholder:text-outline/60"
                  />
                </div>

                {/* Countdown */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-label text-on-surface-variant">
                    {countdown > 0 ? (
                      <>Code expires in <span className="font-bold text-on-surface">{formatTime(countdown)}</span></>
                    ) : (
                      <span className="text-error font-semibold">Code expired</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4 disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>

                {/* Submit */}
                <div className="pt-2 flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full py-4 px-8 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      'Verify & Continue'
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-on-surface-variant font-medium text-sm">Already have an account?</span>
                    <Link href="/login" className="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4">
                      Sign In
                    </Link>
                  </div>
                </div>
              </form>
            )}

            {/* Administrative Access */}
            <div className="mt-8 flex items-center gap-4 text-xs font-label font-semibold text-outline tracking-widest uppercase">
              <span className="w-8 h-[1px] bg-outline-variant" />
              Internal Systems
              <span className="w-8 h-[1px] bg-outline-variant" />
            </div>
            <div className="mt-3">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors group"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-label text-xs font-bold">Administrative Access</span>
              </Link>
            </div>
          </div>

          {/* Right: Decorative */}
          <div className="hidden lg:block relative overflow-hidden bg-slate-900">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop"
              alt="Modern office interior"
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent" />
            <div className="absolute bottom-16 left-16 right-16">
              <div className="glass-panel p-8 rounded-lg">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-tertiary-fixed fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white font-headline text-xl font-bold italic mb-4 leading-relaxed">
                  &ldquo;A seamless registration experience that respects our time and keeps our data secure. Exactly what public service should feel like.&rdquo;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-white/20 flex items-center justify-center text-white font-bold text-sm">
                    SK
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Sarah Kim</p>
                    <p className="text-white/60 text-xs font-medium uppercase tracking-tighter">
                      Deputy Director, Digital Services
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
