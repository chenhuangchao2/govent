'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/participant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      const redirect = searchParams.get('redirect') || '/my-registrations';
      router.push(redirect);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Background effects */}
      <div className="fixed inset-0 iridescent-bg -z-10" />
      <div className="accent-spot top-[-100px] right-[-100px] fixed" />
      <div className="accent-spot bottom-[-100px] left-[-100px] fixed" />

      <main className="flex-grow flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 overflow-hidden rounded-xl glass-panel">
          {/* Left column: Form */}
          <div className="p-10 lg:p-16 flex flex-col justify-center bg-white/20">
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-8">
                <span className="text-lg font-black text-blue-900 tracking-tighter uppercase font-headline">
                  GovEvent
                </span>
              </div>
              <h1 className="font-headline text-5xl lg:text-6xl font-extrabold tracking-tight text-on-surface mb-4 leading-tight">
                Citizen Access
              </h1>
              <p className="text-on-surface-variant text-lg font-medium max-w-sm">
                Enter the digital heart of the state. Secure, efficient, and sovereign.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="font-label text-sm font-semibold tracking-wide text-on-surface-variant ml-1"
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
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.gov"
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
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="font-label text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                  >
                    Forgot Access?
                  </Link>
                </div>
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
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 rounded-full focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-outline/60 font-medium"
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-error text-sm font-medium text-center">{error}</p>
              )}

              {/* Submit + Sign up link */}
              <div className="pt-4 flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-8 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {loading && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  Sign In
                </button>

                <div className="flex items-center justify-center gap-2 pt-4">
                  <span className="text-on-surface-variant font-medium text-sm">
                    New to the platform?
                  </span>
                  <Link
                    href="/signup"
                    className="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </form>

            {/* Internal Systems divider */}
            <div className="mt-16 flex items-center gap-4 text-xs font-label font-semibold text-outline tracking-widest uppercase">
              <span className="w-8 h-[1px] bg-outline-variant" />
              Internal Systems
              <span className="w-8 h-[1px] bg-outline-variant" />
            </div>

            {/* Administrative Access */}
            <div className="mt-6">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors group"
              >
                <svg
                  className="w-4 h-4"
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
                <span className="font-label text-xs font-bold">Administrative Access</span>
              </Link>
            </div>
          </div>

          {/* Right column: Decorative */}
          <div className="hidden lg:block relative overflow-hidden bg-slate-900">
            <img
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop"
              alt="Modern glass building with dramatic light"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent" />
            <div className="absolute bottom-16 left-16 right-16">
              <div className="glass-panel p-8 rounded-lg">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-tertiary-fixed"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white font-headline text-xl font-bold italic mb-4 leading-relaxed">
                  &ldquo;The transition to GovEvent has redefined how we manage civic
                  workshops. It is seamless, beautiful, and profoundly secure.&rdquo;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-white/20 flex items-center justify-center text-white font-bold text-sm">
                    EV
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
            &copy; 2026 Government Events Platform
          </span>
        </div>
      </footer>
    </div>
  );
}
