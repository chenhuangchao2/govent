'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, LogOut } from 'lucide-react'

interface AuthUser {
  email: string
  name: string
}

export default function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/participant/me')
      .then(res => res.json())
      .then(json => { if (json.data) setUser(json.data) })
      .catch(() => {})
  }, [])

  async function logout() {
    await fetch('/api/auth/participant/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/events'
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3 glass-panel rounded-full mt-4 mx-auto w-[95%] max-w-7xl shadow-[0_8px_32px_0_rgba(0,71,141,0.08)]">
        {/* Logo */}
        <Link href="/events" className="text-lg font-black text-blue-900 tracking-tighter uppercase font-headline">
          GovEvent
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/events" className="font-label uppercase tracking-widest text-[11px] font-bold text-blue-700 border-b-2 border-blue-600 pb-1">
            Events
          </Link>
          {user && (
            <Link href="/my-registrations" className="font-label uppercase tracking-widest text-[11px] font-bold text-slate-600 hover:text-blue-900 transition-opacity">
              My Registrations
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="font-label text-[11px] font-bold text-slate-500 uppercase tracking-wider">{user.name}</span>
              <button onClick={logout} className="flex items-center gap-1.5 font-label text-[11px] font-bold text-slate-400 hover:text-red-600 uppercase tracking-wider transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="font-label uppercase tracking-widest text-[11px] font-bold text-slate-600 hover:text-blue-900 transition-opacity">
                Sign In
              </Link>
              <Link href="/signup" className="bg-primary text-white font-label uppercase tracking-widest text-[11px] font-bold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-full text-slate-600 hover:bg-surface-container transition-all"
          onClick={() => setMobileOpen(prev => !prev)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="fixed top-20 left-[2.5%] right-[2.5%] z-40 glass-panel rounded-2xl p-4 space-y-2 shadow-xl md:hidden">
          <Link href="/events" className="block px-4 py-2.5 rounded-xl font-label text-sm font-bold text-blue-700 hover:bg-surface-container-low" onClick={() => setMobileOpen(false)}>
            Events
          </Link>
          {user ? (
            <>
              <Link href="/my-registrations" className="block px-4 py-2.5 rounded-xl font-label text-sm font-medium text-slate-600 hover:bg-surface-container-low" onClick={() => setMobileOpen(false)}>
                My Registrations
              </Link>
              <button onClick={logout} className="block w-full text-left px-4 py-2.5 rounded-xl font-label text-sm font-medium text-red-600 hover:bg-red-50">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block px-4 py-2.5 rounded-xl font-label text-sm font-medium text-slate-600 hover:bg-surface-container-low" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link href="/signup" className="block px-4 py-2.5 rounded-xl font-label text-sm font-bold text-primary hover:bg-primary-fixed/30" onClick={() => setMobileOpen(false)}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </>
  )
}
