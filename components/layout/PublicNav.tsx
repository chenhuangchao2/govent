'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Landmark } from 'lucide-react'

export default function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/events"
          className="flex items-center gap-2 font-bold text-lg text-slate-800 tracking-tight"
        >
          <Landmark className="w-5 h-5 text-blue-700" />
          GovEvent
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/my-registrations"
            className="text-sm text-slate-600 hover:text-blue-700 transition-colors"
          >
            My Registrations
          </Link>
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
          <Link
            href="/my-registrations"
            className="block px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:bg-blue-50"
            onClick={() => setMobileOpen(false)}
          >
            My Registrations
          </Link>
        </div>
      )}
    </nav>
  )
}
