'use client'

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import { Calendar, MapPin, Users } from 'lucide-react'

interface AnalyticsData {
  totalEvents: number
  activeEvents: number
  totalRegistrations: number
  registrationsByStatus: { status: string; count: number }[]
  eventFillRates: { eventTitle: string; registered: number; capacity: number; fillRate: number }[]
  organisationBreakdown: { organisation: string; count: number }[]
  totalCpdHours: number
  upcomingEvents: {
    id: string; title: string; startTime: string; endTime: string
    venue: string; registered: number; capacity: number; isPaid: boolean
  }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d97706',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
  WAITLISTED: '#2563eb',
  ATTENDED: '#059669',
  NO_SHOW: '#6b7280',
  PENDING_PAYMENT: '#8b5cf6',
  PAYMENT_FAILED: '#ef4444',
}

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || '#94a3b8'
}

function SkeletonPanel() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
      <div className="h-48 bg-gray-100 rounded" />
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(json => {
        if (json.error) setError(json.error)
        else setData(json.data ?? json)
      })
      .catch(() => setError('Failed to load analytics'))
  }, [])

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
    )
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonPanel key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Registration Status Breakdown */}
      <Panel title="Registration Status">
        {data.registrationsByStatus.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data.registrationsByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="45%"
                outerRadius={80}
                innerRadius={35}
                paddingAngle={2}
                label={({ payload, x, y, midAngle }: { payload?: { status?: string; count?: number }; x?: number; y?: number; midAngle?: number }) => {
                  const anchor = (midAngle ?? 0) > 90 && (midAngle ?? 0) < 270 ? 'end' : 'start'
                  return (
                    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" className="text-xs fill-gray-700">
                      {`${payload?.status ?? ''} (${payload?.count ?? 0})`}
                    </text>
                  )
                }}
                labelLine={{ strokeWidth: 1, stroke: '#9ca3af', offset: 20 }}
              >
                {data.registrationsByStatus.map((entry) => (
                  <Cell key={entry.status} fill={getStatusColor(entry.status)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* 2. Event Fill Rates */}
      <Panel title="Event Fill Rates">
        {data.eventFillRates.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No data yet</p>
        ) : (
          <div className="space-y-4">
            {data.eventFillRates.map((e) => {
              const pct = Math.min(e.fillRate, 100)
              const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500'
              return (
                <div key={e.eventTitle}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate flex-1 mr-3">{e.eventTitle}</p>
                    <span className="text-xs font-semibold text-gray-500 shrink-0">
                      {e.registered}/{e.capacity} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* 3. Registrations by Organisation */}
      <Panel title="Registrations by Organisation">
        {data.organisationBreakdown.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.organisationBreakdown} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="organisation" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* 4. Upcoming Schedule */}
      <Panel title="Upcoming Schedule">
        {data.upcomingEvents.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No upcoming events</p>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {data.upcomingEvents.map((e) => {
              const start = new Date(e.startTime)
              const day = start.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
              const time = start.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true })
              const pct = e.capacity > 0 ? Math.round((e.registered / e.capacity) * 100) : 0
              return (
                <Link key={e.id} href={`/admin/events/${e.id}`} className="block">
                  <div className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                    {/* Date badge */}
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-blue-50 shrink-0">
                      <span className="text-xs font-medium text-blue-600">{start.toLocaleDateString('en-SG', { weekday: 'short' })}</span>
                      <span className="text-lg font-bold text-blue-700">{start.getDate()}</span>
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{e.title}</p>
                        {e.isPaid && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">Paid</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{day} {time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.venue || 'TBC'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[120px]">
                          <div
                            className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Users className="w-3 h-3" />{e.registered}/{e.capacity}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}
