'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Landmark, LogOut } from 'lucide-react'

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
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/events" className="flex items-center gap-2 font-bold text-lg text-slate-800 tracking-tight">
          <Landmark className="w-5 h-5 text-blue-700" />
          GovEvent
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
          {user ? (
            <>
              <Link href="/my-registrations" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                My Registrations
              </Link>
              <span className="text-sm text-gray-500">Hi, <span className="font-medium text-gray-700">{user.name}</span></span>
              <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-600 transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {user ? (
            <>
              <Link href="/my-registrations" className="block px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50" onClick={() => setMobileOpen(false)}>
                My Registrations
              </Link>
              <p className="px-3 py-2 text-sm text-gray-500">Hi, <span className="font-medium text-gray-700">{user.name}</span></p>
              <button onClick={logout} className="block w-full text-left px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link href="/signup" className="block px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50" onClick={() => setMobileOpen(false)}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
