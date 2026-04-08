'use client'

import { useEffect, useState } from 'react'

interface Props {
  eventId: string
}

interface StatsData {
  approved: number
  attended: number
  total: number
  remaining: number
  lastFive: { name: string; checkedInAt: string }[]
}

export default function CheckInStatsPanel({ eventId }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/events/${eventId}/checkin-stats`)
        const json = await res.json()
        if (json.data) setStats(json.data)
      } catch {
        // silently retry on next interval
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [eventId])

  if (!stats) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    )
  }

  const percentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Check-in Progress</p>
        <p className="text-2xl font-bold text-gray-900">
          {stats.attended} <span className="text-base font-normal text-gray-500">/ {stats.total} checked in</span>
        </p>
        <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">{stats.remaining} still expected</p>
      </div>

      {stats.lastFive.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Recent Check-ins</p>
          <ul className="space-y-1.5">
            {stats.lastFive.map((entry, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 truncate mr-2">{entry.name}</span>
                <span className="text-gray-400 text-xs whitespace-nowrap">
                  {new Date(entry.checkedInAt).toLocaleTimeString('en-SG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
