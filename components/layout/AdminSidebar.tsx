'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/audit-log', label: 'Audit Log' },
  { href: '/admin/blacklist', label: 'Blacklist' },
]

export default function AdminSidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 bg-gray-900 min-h-screen px-3 py-6 flex flex-col">
      <p className="text-white font-semibold px-3 mb-6">GovEvent Admin</p>
      <nav className="space-y-1 flex-1">
        {links.map(l => {
          const active = l.exact ? path === l.href : path.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              {l.label}
            </Link>
          )
        })}
      </nav>
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white">Sign out</button>
      </form>
    </aside>
  )
}
