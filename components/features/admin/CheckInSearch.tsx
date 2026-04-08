'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Props {
  eventId: string
}

interface Registration {
  id: string
  name: string
  email: string
}

export default function CheckInSearch({ eventId }: Props) {
  const [query, setQuery] = useState('')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    async function loadRegistrations() {
      try {
        const res = await fetch(`/api/registrations?eventId=${eventId}&status=APPROVED`)
        const json = await res.json()
        setRegistrations(json.data ?? [])
      } catch {
        toast.error('Failed to load registrations')
      } finally {
        setLoading(false)
      }
    }
    loadRegistrations()
  }, [eventId])

  const filtered = registrations.filter((r) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
  })

  async function handleCheckin(reg: Registration) {
    try {
      const res = await fetch(`/api/registrations/${reg.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const data = await res.json()
      if (res.ok) {
        setFlash({ type: 'success', message: `${reg.name} checked in!` })
        toast.success(`${reg.name} checked in`)
        setRegistrations((prev) => prev.filter((r) => r.id !== reg.id))
      } else {
        setFlash({ type: 'error', message: data.error || 'Check-in failed' })
        toast.error(data.error || 'Check-in failed')
      }
    } catch {
      setFlash({ type: 'error', message: 'Network error' })
      toast.error('Network error')
    }
    setTimeout(() => setFlash(null), 2000)
  }

  return (
    <div className="space-y-3">
      {flash && (
        <div
          className={`px-3 py-2 rounded-lg text-sm font-medium text-white transition-all ${
            flash.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {flash.message}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />

      {loading ? (
        <div className="text-sm text-gray-500">Loading registrations...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500">
          {query ? 'No matching registrations found' : 'No approved registrations'}
        </div>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((reg) => (
            <li
              key={reg.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
            >
              <div className="min-w-0 mr-2">
                <p className="text-sm font-medium text-gray-900 truncate">{reg.name}</p>
                <p className="text-xs text-gray-500 truncate">{reg.email}</p>
              </div>
              <button
                onClick={() => handleCheckin(reg)}
                className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                Check In
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
