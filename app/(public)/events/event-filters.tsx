'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';

type EventWithCount = {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  venue: string;
  capacity: number;
  tags: string[];
  allowedOrganisations: string[];
  isPaid: boolean;
  price: number | null;
  imageUrl: string | null;
  _count: { registrations: number };
};

// Serialized version (dates come as strings from server)
type SerializedEvent = Omit<EventWithCount, 'startTime' | 'endTime'> & {
  startTime: string;
  endTime: string;
};

function ChevronDown() {
  return (
    <svg
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function formatGridTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day} · ${time}`;
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-white/80 shadow-sm border border-white/60"
      >
        {label}: <span className="font-bold">{value}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-outline-variant/15 py-1 z-50 min-w-[180px]">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${opt === value ? 'font-bold text-primary' : 'text-slate-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function isAITag(tags: string[]): boolean {
  return tags.some((t) => t.toLowerCase().includes('ai'));
}

export default function EventFilters({ events }: { events: SerializedEvent[] }) {
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('All');
  const [topicFilter, setTopicFilter] = useState('All');
  const [orgFilter, setOrgFilter] = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return ['All', ...Array.from(set).sort()];
  }, [events]);

  const allOrgs = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.allowedOrganisations.forEach((o) => set.add(o)));
    return ['All', 'Open to Everyone', ...Array.from(set).sort()];
  }, [events]);

  const filtered = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false;
      }
      // Time
      if (timeFilter === 'This Week') {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
        weekEnd.setHours(23, 59, 59, 999);
        const start = new Date(e.startTime);
        if (start < now || start > weekEnd) return false;
      } else if (timeFilter === 'This Month') {
        const start = new Date(e.startTime);
        if (start.getMonth() !== now.getMonth() || start.getFullYear() !== now.getFullYear()) return false;
      }
      // Topic
      if (topicFilter !== 'All') {
        if (!e.tags.includes(topicFilter)) return false;
      }
      // Open To filter
      if (orgFilter === 'Open to Everyone') {
        // Only show events with no org restriction
        if (e.allowedOrganisations.length > 0) return false;
      } else if (orgFilter !== 'All') {
        // Show only events restricted to this specific org
        if (!e.allowedOrganisations.includes(orgFilter)) return false;
      }
      // Free
      if (freeOnly && e.isPaid) return false;
      return true;
    });
  }, [events, search, timeFilter, topicFilter, orgFilter, freeOnly]);

  return (
    <>
      {/* Search + Filters — single row, search fills remaining space */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
        {/* Search — takes remaining space */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-outline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white/70 backdrop-blur-xl border border-outline-variant/30 rounded-full focus:ring-2 focus:ring-primary-fixed font-label transition-all placeholder:text-outline text-sm shadow-sm"
            placeholder="Search events..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-outline-variant/30 shrink-0" />
        <Dropdown
          label="Time"
          value={timeFilter}
          options={['All', 'This Week', 'This Month']}
          onChange={setTimeFilter}
        />
        <Dropdown
          label="Topic"
          value={topicFilter}
          options={allTopics}
          onChange={setTopicFilter}
        />
        <Dropdown
          label="Open To"
          value={orgFilter}
          options={allOrgs}
          onChange={setOrgFilter}
        />
        <button
          onClick={() => setFreeOnly(!freeOnly)}
          className={`px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer shadow-sm transition-colors ${freeOnly ? 'bg-primary text-white border border-primary' : 'bg-white/70 text-slate-700 border border-outline-variant/15 hover:bg-white/80'}`}
        >
          Free Only
        </button>
      </div>

      {/* Bento Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-on-surface-variant text-lg font-medium">No events found</p>
          <p className="text-outline text-sm mt-2">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event, idx) => {
            const highlight = isAITag(event.tags);
            const tagColorClass = idx % 2 === 0
              ? 'bg-secondary-fixed/30 text-on-secondary-fixed-variant'
              : 'bg-tertiary-fixed/30 text-on-tertiary-fixed-variant';
            const hasRestriction = event.allowedOrganisations.length > 0;
            const restrictionLabel = event.allowedOrganisations.join(', ') + ' Only';
            const priceLabel = event.isPaid && event.price ? `SGD ${event.price.toFixed(2)}` : null;
            const timeLabel = formatGridTime(event.startTime) + (!event.isPaid ? ' · FREE' : '');
            const tagLabel = event.tags.join(' · ') || 'Event';

            if (highlight) {
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-primary p-6 rounded-xl text-white flex flex-col justify-between group overflow-hidden relative cursor-pointer block"
                >
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="px-3 py-1 bg-white/20 text-[9px] font-black uppercase tracking-widest rounded-full font-label">
                        {tagLabel}
                      </div>
                    </div>
                    <h4 className="text-xl font-bold tracking-tight mb-2 leading-tight">
                      {event.title}
                    </h4>
                    <p className="text-white/70 text-sm font-medium">
                      {event.description}
                    </p>
                  </div>
                  <div className="mt-8 flex items-center gap-3">
                    <span className="text-[10px] font-bold font-label text-white/60 uppercase">
                      {timeLabel}
                    </span>
                    {priceLabel && (
                      <span className="text-[10px] font-bold font-label text-amber-300 uppercase">
                        {priceLabel}
                      </span>
                    )}
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-surface-container-low p-6 rounded-xl hover:bg-white transition-all duration-300 group cursor-pointer block"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-3 py-1 ${tagColorClass} text-[9px] font-black uppercase tracking-widest rounded-full font-label`}>
                    {tagLabel}
                  </div>
                  {hasRestriction && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full font-label uppercase">
                      {restrictionLabel}
                    </span>
                  )}
                </div>
                <h4 className="text-xl font-bold tracking-tight mb-2">
                  {event.title}
                </h4>
                <p className="text-on-surface-variant text-sm font-medium mb-6">
                  {event.description}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold font-label text-outline uppercase">
                    {timeLabel}
                  </span>
                  {priceLabel && (
                    <span className="text-[10px] font-bold font-label text-amber-700 uppercase">
                      {priceLabel}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
