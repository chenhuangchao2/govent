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
  topicBreakdown: { topic: string; count: number }[]
  totalCpdHours: number
  upcomingEvents: {
    id: string; title: string; startTime: string; endTime: string
    venue: string; registered: number; capacity: number; isPaid: boolean
  }[]
}

const TOPIC_COLORS: Record<string, string> = {
  AI: '#7c3aed',
  Cloud: '#0284c7',
  Cybersecurity: '#dc2626',
  Data: '#0d9488',
  Design: '#db2777',
  Agile: '#ea580c',
  Leadership: '#4f46e5',
  Compliance: '#6b7280',
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

      {/* 2. Popular Topics */}
      <Panel title="Popular Topics">
        {(!data.topicBreakdown || data.topicBreakdown.length === 0) ? (
          <p className="text-gray-400 text-sm text-center py-12">No topics yet</p>
        ) : (
          <div className="space-y-4">
            {data.topicBreakdown.slice(0, 5).map((t, i) => {
              const maxCount = data.topicBreakdown[0].count
              const pct = maxCount > 0 ? Math.max(Math.round((t.count / maxCount) * 100), 12) : 12
              const color = TOPIC_COLORS[t.topic] || '#6b7280'
              return (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-300 w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-900">{t.topic}</span>
                      <span className="text-xs font-medium text-gray-500">{t.count} event{t.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* 3. Upcoming Schedule — full width */}
      <div className="lg:col-span-2">
      <Panel title="Upcoming Schedule">
        {data.upcomingEvents.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No upcoming events</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.upcomingEvents.map((e) => {
              const start = new Date(e.startTime)
              const day = start.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
              const time = start.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true })
              const pct = e.capacity > 0 ? Math.round((e.registered / e.capacity) * 100) : 0
              return (
                <Link key={e.id} href={`/admin/events/${e.id}`} className="block">
                  <div className="p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors h-full">
                    <div className="flex items-start gap-3">
                      {/* Date badge */}
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-blue-50 shrink-0">
                        <span className="text-[10px] font-medium text-blue-600">{start.toLocaleDateString('en-SG', { weekday: 'short' })}</span>
                        <span className="text-base font-bold text-blue-700">{start.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{e.title}</p>
                          {e.isPaid && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">Paid</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />{day} {time}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{e.venue || 'TBC'}</p>
                      </div>
                    </div>
                    {/* Fill bar — horizontal, full width */}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-blue-400'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0"><Users className="w-3 h-3" />{e.registered}/{e.capacity}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Panel>
      </div>
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
