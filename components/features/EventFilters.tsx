'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import EventCard from './EventCard'

interface EventData {
  id: string
  title: string
  startTime: string
  venue: string
  capacity: number
  registeredCount: number
  isPaid: boolean
  price: number | null
  allowedDomains: string[]
  allowedOrganisations: string[]
}

const TIME_FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'this-week', label: 'This Week' },
  { key: 'all', label: 'All' },
] as const

const COST_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'paid', label: 'Paid' },
] as const

export default function EventFilters({ events }: { events: EventData[] }) {
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'this-week' | 'all'>('upcoming')
  const [costFilter, setCostFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [orgFilter, setOrgFilter] = useState<string>('all')

  // Collect unique organisations (case-insensitive dedup, keep first casing seen)
  const allOrgs = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of events) {
      for (const o of e.allowedOrganisations) {
        const key = o.toLowerCase()
        if (!seen.has(key)) seen.set(key, o)
      }
    }
    return Array.from(seen.values()).sort()
  }, [events])

  const filtered = useMemo(() => {
    const now = new Date()
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()))
    weekEnd.setHours(23, 59, 59, 999)

    return events.filter(e => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!e.title.toLowerCase().includes(q) && !e.venue.toLowerCase().includes(q)) return false
      }

      // Time
      const start = new Date(e.startTime)
      if (timeFilter === 'upcoming' && start < now) return false
      if (timeFilter === 'this-week' && (start < now || start > weekEnd)) return false

      // Cost
      if (costFilter === 'free' && e.isPaid) return false
      if (costFilter === 'paid' && !e.isPaid) return false

      // Organisation
      if (orgFilter !== 'all') {
        if (orgFilter === 'open') {
          if (e.allowedOrganisations.length > 0) return false
        } else {
          if (!e.allowedOrganisations.some(o => o.toLowerCase() === orgFilter.toLowerCase())) return false
        }
      }

      return true
    })
  }, [events, search, timeFilter, costFilter, orgFilter])

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Time */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {TIME_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                timeFilter === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cost */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {COST_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setCostFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                costFilter === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Organisation */}
        {allOrgs.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400">Open to:</span>
            <button
              onClick={() => setOrgFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                orgFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setOrgFilter('open')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                orgFilter === 'open'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Open to Everyone
            </button>
            {allOrgs.map(org => (
              <button
                key={org}
                onClick={() => setOrgFilter(org)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  orgFilter === org
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {org}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No events match your filters.</p>
            <button
              onClick={() => { setSearch(''); setTimeFilter('upcoming'); setCostFilter('all'); setOrgFilter('all') }}
              className="text-sm text-blue-600 hover:underline mt-2"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(e => (
              <EventCard
                key={e.id}
                id={e.id}
                title={e.title}
                startTime={e.startTime}
                venue={e.venue}
                capacity={e.capacity}
                registeredCount={e.registeredCount}
                isPaid={e.isPaid}
                price={e.price}
                allowedDomains={e.allowedDomains}
                allowedOrganisations={e.allowedOrganisations}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
