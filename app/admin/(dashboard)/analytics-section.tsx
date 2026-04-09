'use client'

import { useEffect, useState } from 'react'

interface StatusBreakdown {
  status: string
  count: number
}

interface TopicBreakdown {
  topic: string
  count: number
}

interface UpcomingEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  venue: string
  registered: number
  capacity: number
  isPaid: boolean
}

interface AnalyticsData {
  registrationsByStatus: StatusBreakdown[]
  topicBreakdown: TopicBreakdown[]
  upcomingEvents: UpcomingEvent[]
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#00478d',
  PENDING: '#bac3ff',
  WAITLISTED: '#44d8f1',
  REJECTED: '#ba1a1a',
  ATTENDED: '#16a34a',
  NO_SHOW: '#727783',
  PENDING_PAYMENT: '#d97706',
  CANCELLED: '#9ca3af',
  PAYMENT_FAILED: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  WAITLISTED: 'Waitlisted',
  REJECTED: 'Rejected',
  ATTENDED: 'Attended',
  NO_SHOW: 'No Show',
  PENDING_PAYMENT: 'Pending Pay',
  CANCELLED: 'Cancelled',
  PAYMENT_FAILED: 'Pay Failed',
}

/* ── Donut Chart ── */
function DonutChart({ data }: { data: StatusBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-outline">
        No registration data yet
      </div>
    )
  }

  const radius = 70
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const sorted = [...data].sort((a, b) => b.count - a.count)

  return (
    <div>
      <div className="flex items-center justify-center relative py-4">
        <svg className="w-44 h-44 -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="20" />
          {sorted.map((item) => {
            const pct = item.count / total
            const dashLength = pct * circumference
            const dashOffset = offset * circumference
            offset += pct
            return (
              <circle
                key={item.status}
                cx="90" cy="90" r={radius}
                fill="transparent"
                stroke={STATUS_COLORS[item.status] || '#9ca3af'}
                strokeWidth="20"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-dashOffset}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-on-surface tracking-tight">{total.toLocaleString()}</span>
          <span className="text-xs text-outline font-semibold uppercase tracking-wider">Total</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-4">
        {sorted.filter(s => s.count > 0).slice(0, 5).map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || '#9ca3af' }} />
            <span className="text-xs text-on-surface-variant font-medium">
              {STATUS_LABELS[item.status] || item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Topics Chart (horizontal bars) ── */
function TopicsChart({ data }: { data: TopicBreakdown[] }) {
  const top5 = data.slice(0, 5)
  const max = top5.length > 0 ? top5[0].count : 1

  if (top5.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-outline">
        No topic data yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {top5.map((item) => {
        const widthPct = Math.max((item.count / max) * 100, 8)
        return (
          <div key={item.topic}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-on-surface">{item.topic}</span>
              <span className="text-xs font-bold text-outline">{item.count}</span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Upcoming Schedule ── */
function ScheduleList({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-outline py-12">
        No upcoming events
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
        {events.map((evt) => {
          const start = new Date(evt.startTime)
          const end = new Date(evt.endTime)
          const day = start.getDate().toString().padStart(2, '0')
          const month = start.toLocaleString('en-US', { month: 'short' }).toUpperCase()
          const timeRange = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
          const fillPct = evt.capacity > 0 ? Math.round((evt.registered / evt.capacity) * 100) : 0

          return (
            <div key={evt.id} className="bg-surface-container-low p-5 rounded-lg hover:bg-white hover:shadow-sm transition-all w-72 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-extrabold text-on-surface">{day}</span>
                <span className="text-xs font-bold text-outline uppercase tracking-wider">{month}</span>
              </div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{timeRange}</p>
              <h5 className="font-bold text-sm mb-4 line-clamp-2 min-h-[2.5rem]">{evt.title}</h5>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(fillPct, 100)}%` }} />
              </div>
              <p className="text-xs text-outline font-medium mt-1.5">{evt.registered}/{evt.capacity} registered</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Section ── */
export default function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setData({
            registrationsByStatus: json.data.registrationsByStatus || [],
            topicBreakdown: json.data.topicBreakdown || [],
            upcomingEvents: json.data.upcomingEvents || [],
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-outline-variant/10 animate-pulse h-64" />
          <div className="bg-white p-6 rounded-lg border border-outline-variant/10 animate-pulse h-64" />
        </div>
        <div className="bg-white p-6 rounded-lg border border-outline-variant/10 animate-pulse h-48" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Row 1: Donut + Topics side by side, content-height */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="bg-white p-6 rounded-lg border border-outline-variant/10">
          <h4 className="font-bold text-base mb-4">Registration Status</h4>
          <DonutChart data={data.registrationsByStatus} />
        </div>

        <div className="bg-white p-6 rounded-lg border border-outline-variant/10">
          <h4 className="font-bold text-base mb-4">Popular Topics</h4>
          <TopicsChart data={data.topicBreakdown} />
        </div>
      </div>

      {/* Row 2: Upcoming Schedule full width, horizontal cards */}
      <div className="bg-white p-6 rounded-lg border border-outline-variant/10">
        <h4 className="font-bold text-base mb-4">Upcoming Schedule</h4>
        <ScheduleList events={data.upcomingEvents} />
      </div>
    </div>
  )
}
