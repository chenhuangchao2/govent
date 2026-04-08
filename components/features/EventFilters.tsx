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
  tags: string[]
}

const TIME_FILTERS = [
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'all', label: 'All' },
] as const

const COST_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'paid', label: 'Paid' },
] as const

export default function EventFilters({ events }: { events: EventData[] }) {
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState<'this-week' | 'this-month' | 'all'>('this-week')
  const [costFilter, setCostFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Collect unique tags
  const allTags = useMemo(() => {
    const seen = new Set<string>()
    for (const e of events) {
      for (const t of e.tags) seen.add(t)
    }
    return Array.from(seen).sort()
  }, [events])

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

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }
  function toggleOrg(org: string) {
    setSelectedOrgs(prev => prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org])
  }

  const filtered = useMemo(() => {
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    weekEnd.setHours(23, 59, 59, 999)
    const monthEnd = new Date(now)
    monthEnd.setDate(monthEnd.getDate() + 30)
    monthEnd.setHours(23, 59, 59, 999)

    return events.filter(e => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!e.title.toLowerCase().includes(q) && !e.venue.toLowerCase().includes(q)) return false
      }

      // Time — all filters only show future events
      const start = new Date(e.startTime)
      if (start < now) return false
      if (timeFilter === 'this-week' && start > weekEnd) return false
      if (timeFilter === 'this-month' && start > monthEnd) return false

      // Cost
      if (costFilter === 'free' && e.isPaid) return false
      if (costFilter === 'paid' && !e.isPaid) return false

      // Tags (multi-select: event must have ALL selected tags)
      if (selectedTags.length > 0) {
        if (!selectedTags.some(t => e.tags.includes(t))) return false
      }

      // Organisation (multi-select)
      if (selectedOrgs.length > 0) {
        if (e.allowedOrganisations.length === 0) return true // open to all matches any org filter
        if (!selectedOrgs.some(o => e.allowedOrganisations.some(ao => ao.toLowerCase() === o.toLowerCase()))) return false
      }

      return true
    })
  }, [events, search, timeFilter, costFilter, selectedOrgs, selectedTags])

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

        {/* Topic dropdown multi-select */}
        {allTags.length > 0 && (
          <div className="relative">
            <details className="group">
              <summary className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50 select-none list-none">
                {selectedTags.length === 0 ? 'All Topics' : selectedTags.join(', ')} {selectedTags.length > 0 && <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">{selectedTags.length}</span>}
                <svg className="w-3 h-3 ml-1 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                {allTags.map(tag => (
                  <label key={tag} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs">
                    <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} className="rounded" />
                    {tag}
                  </label>
                ))}
                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 mt-1">
                    Clear
                  </button>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Organisation dropdown multi-select */}
        {allOrgs.length > 0 && (
          <div className="relative">
            <details className="group">
              <summary className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50 select-none list-none">
                {selectedOrgs.length === 0 ? 'Open To: All' : selectedOrgs.join(', ')} {selectedOrgs.length > 0 && <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">{selectedOrgs.length}</span>}
                <svg className="w-3 h-3 ml-1 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                {allOrgs.map(org => (
                  <label key={org} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs">
                    <input type="checkbox" checked={selectedOrgs.includes(org)} onChange={() => toggleOrg(org)} className="rounded" />
                    {org}
                  </label>
                ))}
                {selectedOrgs.length > 0 && (
                  <button onClick={() => setSelectedOrgs([])} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 mt-1">
                    Clear
                  </button>
                )}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No events match your filters.</p>
            <button
              onClick={() => { setSearch(''); setTimeFilter('this-week'); setCostFilter('all'); setSelectedOrgs([]); setSelectedTags([]) }}
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
                tags={e.tags}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
