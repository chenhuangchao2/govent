'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Search, ChevronDown } from 'lucide-react'

interface EventData {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  venue: string
  capacity: number
  registeredCount: number
  isPaid: boolean
  price: number | null
  allowedDomains: string[]
  allowedOrganisations: string[]
  tags: string[]
  imageUrl: string | null
}

const TIME_FILTERS = [
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'all', label: 'All' },
] as const

const TAG_COLORS: Record<string, string> = {
  AI: 'bg-purple-100/60 text-purple-700',
  Cloud: 'bg-sky-100/60 text-sky-700',
  Cybersecurity: 'bg-red-100/60 text-red-700',
  Data: 'bg-teal-100/60 text-teal-700',
  Design: 'bg-pink-100/60 text-pink-700',
  Agile: 'bg-orange-100/60 text-orange-700',
  Leadership: 'bg-indigo-100/60 text-indigo-700',
  Compliance: 'bg-gray-200/60 text-gray-700',
}

function DropdownFilter({ label, value, children, open, onToggle }: {
  label: string
  value: string
  children: React.ReactNode
  open: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onToggle])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-white/80 shadow-sm border border-white/60"
      >
        {label}: <span className="font-bold">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg z-20 py-2 min-w-[180px]">
          {children}
        </div>
      )}
    </div>
  )
}

export default function EventGrid({ events }: { events: EventData[] }) {
  const [search, setSearch] = useState('')
  const [timeFilter, setTimeFilter] = useState<'this-week' | 'this-month' | 'all'>('all')
  const [costFilter, setCostFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const timeAndCostFiltered = useMemo(() => {
    const now = new Date()
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7); weekEnd.setHours(23, 59, 59, 999)
    const monthEnd = new Date(now); monthEnd.setDate(monthEnd.getDate() + 30); monthEnd.setHours(23, 59, 59, 999)
    return events.filter(e => {
      const start = new Date(e.startTime)
      if (start < now) return false
      if (timeFilter === 'this-week' && start > weekEnd) return false
      if (timeFilter === 'this-month' && start > monthEnd) return false
      if (costFilter === 'free' && e.isPaid) return false
      if (costFilter === 'paid' && !e.isPaid) return false
      return true
    })
  }, [events, timeFilter, costFilter])

  const allTags = useMemo(() => {
    const seen = new Set<string>()
    for (const e of timeAndCostFiltered) for (const t of e.tags) seen.add(t)
    return Array.from(seen).sort()
  }, [timeAndCostFiltered])

  const allOrgs = useMemo(() => {
    const seen = new Map<string, string>()
    for (const e of timeAndCostFiltered) for (const o of e.allowedOrganisations) {
      const key = o.toLowerCase()
      if (!seen.has(key)) seen.set(key, o)
    }
    return Array.from(seen.values()).sort()
  }, [timeAndCostFiltered])

  function toggleTag(tag: string) { setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]) }
  function toggleOrg(org: string) { setSelectedOrgs(prev => prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]) }

  const filtered = useMemo(() => {
    const now = new Date()
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7); weekEnd.setHours(23, 59, 59, 999)
    const monthEnd = new Date(now); monthEnd.setDate(monthEnd.getDate() + 30); monthEnd.setHours(23, 59, 59, 999)
    return events.filter(e => {
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!e.title.toLowerCase().includes(q) && !e.venue.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false
      }
      const start = new Date(e.startTime)
      if (start < now) return false
      if (timeFilter === 'this-week' && start > weekEnd) return false
      if (timeFilter === 'this-month' && start > monthEnd) return false
      if (costFilter === 'free' && e.isPaid) return false
      if (costFilter === 'paid' && !e.isPaid) return false
      if (selectedTags.length > 0 && !selectedTags.some(t => e.tags.includes(t))) return false
      if (selectedOrgs.length > 0) {
        if (e.allowedOrganisations.length === 0) return false
        if (!selectedOrgs.some(o => e.allowedOrganisations.some(ao => ao.toLowerCase() === o.toLowerCase()))) return false
      }
      return true
    })
  }, [events, search, timeFilter, costFilter, selectedTags, selectedOrgs])

  return (
    <section className="mb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-headline font-extrabold tracking-tight">Active Registries</h2>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events..."
          className="w-full pl-12 pr-4 py-4 bg-surface-container-high/40 backdrop-blur-xl border-none rounded-2xl focus:ring-2 focus:ring-primary-fixed outline-none font-label transition-all placeholder:text-outline shadow-sm text-sm"
        />
      </div>

      {/* Glass Pill Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <DropdownFilter
          label="Time"
          value={TIME_FILTERS.find(f => f.key === timeFilter)?.label || 'All'}
          open={openDropdown === 'time'}
          onToggle={() => setOpenDropdown(prev => prev === 'time' ? null : 'time')}
        >
          {TIME_FILTERS.map(f => (
            <label key={f.key} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
              <input type="radio" name="time" checked={timeFilter === f.key} onChange={() => { setTimeFilter(f.key); setOpenDropdown(null) }} className="text-primary focus:ring-primary" />
              {f.label}
            </label>
          ))}
        </DropdownFilter>

        {allTags.length > 0 && (
          <DropdownFilter
            label="Topic"
            value={selectedTags.length === 0 ? 'All' : selectedTags.length === 1 ? selectedTags[0] : `${selectedTags.length} selected`}
            open={openDropdown === 'topic'}
            onToggle={() => setOpenDropdown(prev => prev === 'topic' ? null : 'topic')}
          >
            {allTags.map(tag => (
              <label key={tag} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                {tag}
              </label>
            ))}
            {selectedTags.length > 0 && (
              <button onClick={() => setSelectedTags([])} className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-gray-600 border-t border-gray-100 mt-1">Clear</button>
            )}
          </DropdownFilter>
        )}

        {allOrgs.length > 0 && (
          <DropdownFilter
            label="Org"
            value={selectedOrgs.length === 0 ? 'All' : selectedOrgs.length === 1 ? selectedOrgs[0] : `${selectedOrgs.length} selected`}
            open={openDropdown === 'org'}
            onToggle={() => setOpenDropdown(prev => prev === 'org' ? null : 'org')}
          >
            {allOrgs.map(org => (
              <label key={org} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                <input type="checkbox" checked={selectedOrgs.includes(org)} onChange={() => toggleOrg(org)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                {org}
              </label>
            ))}
            {selectedOrgs.length > 0 && (
              <button onClick={() => setSelectedOrgs([])} className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-gray-600 border-t border-gray-100 mt-1">Clear</button>
            )}
          </DropdownFilter>
        )}

        <button
          onClick={() => setCostFilter(prev => prev === 'free' ? 'all' : 'free')}
          className={`glass-panel px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer shadow-sm border transition-colors ${
            costFilter === 'free'
              ? 'bg-primary-fixed/40 text-primary border-primary/20'
              : 'text-slate-700 hover:bg-white/80 border-white/60'
          }`}
        >
          Free Only
        </button>
      </div>

      {/* Bento Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-on-surface-variant text-sm font-medium">No events match your filters.</p>
          <button
            onClick={() => { setSearch(''); setTimeFilter('all'); setCostFilter('all'); setSelectedOrgs([]); setSelectedTags([]) }}
            className="text-sm text-primary font-bold mt-3 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-label font-bold text-outline uppercase tracking-wider mb-4">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((e, i) => {
              // Every 3rd card gets the highlight treatment
              const isHighlight = i % 3 === 2

              if (isHighlight) {
                return (
                  <Link key={e.id} href={`/events/${e.id}`} className="block">
                    <div className="bg-primary p-6 rounded-xl text-white flex flex-col justify-between group overflow-hidden relative cursor-pointer h-full hover:shadow-xl transition-shadow">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="px-3 py-1 bg-white/20 text-[9px] font-black uppercase tracking-widest rounded-full font-label">
                            {e.tags.join(' · ') || 'Event'}
                          </div>
                        </div>
                        <h4 className="text-xl font-headline font-bold tracking-tight mb-2 leading-tight">{e.title}</h4>
                        <p className="text-white/70 text-sm font-medium line-clamp-2">{e.description}</p>
                      </div>
                      <div className="mt-8 flex items-center justify-between">
                        <span className="text-[10px] font-bold font-label text-white/60 uppercase">
                          {new Date(e.startTime).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })} · {new Date(e.startTime).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          {!e.isPaid && ' · FREE'}
                          {e.isPaid && e.price != null && ` · SGD ${e.price.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              }

              return (
                <Link key={e.id} href={`/events/${e.id}`} className="block">
                  <div className="bg-surface-container-low p-6 rounded-xl hover:bg-white transition-all duration-300 group cursor-pointer h-full">
                    <div className="flex justify-between items-start mb-6">
                      {e.tags[0] ? (
                        <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full font-label ${TAG_COLORS[e.tags[0]] || 'bg-gray-100/60 text-gray-600'}`}>
                          {e.tags[0]}
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-gray-100/60 text-gray-600 text-[9px] font-black uppercase tracking-widest rounded-full font-label">Event</div>
                      )}
                      {e.allowedOrganisations.length > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100/60 text-amber-800 text-[9px] font-bold rounded-full font-label uppercase">{e.allowedOrganisations[0]} Only</span>
                      )}
                    </div>
                    <h4 className="text-xl font-headline font-bold tracking-tight mb-2">{e.title}</h4>
                    <p className="text-on-surface-variant text-sm font-medium mb-6 line-clamp-2">{e.description}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold font-label text-outline uppercase">
                        {new Date(e.startTime).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })} · {new Date(e.startTime).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                      {e.isPaid && e.price != null && (
                        <span className="text-[10px] font-bold font-label text-amber-700 uppercase">SGD {e.price.toFixed(2)}</span>
                      )}
                      {!e.isPaid && (
                        <span className="text-[10px] font-bold font-label text-green-700 uppercase">FREE</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
