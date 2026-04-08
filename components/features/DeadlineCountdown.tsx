'use client'

import { useState, useEffect } from 'react'

interface DeadlineCountdownProps {
  deadline: string
}

function getRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  return diff
}

export default function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemaining(deadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemaining(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remaining <= 0) {
    return (
      <p className="text-sm text-red-600 font-medium">Registration closed</p>
    )
  }

  const totalSeconds = Math.floor(remaining / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = totalMinutes % 60

  const moreThan24h = remaining > 24 * 60 * 60 * 1000

  if (moreThan24h) {
    return (
      <p className="text-sm text-gray-600">
        Registration closes in {days}d {hours}h {minutes}m
      </p>
    )
  }

  return (
    <p className="text-sm text-amber-600 font-medium">
      Registration closes in {hours}h {minutes}m
    </p>
  )
}
