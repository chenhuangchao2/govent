import Link from 'next/link'
import CapacityBar from '@/components/features/CapacityBar'

interface EventCardProps {
  id: string
  title: string
  startTime: string
  venue: string
  capacity: number
  registeredCount: number
  isPaid: boolean
  price?: number | null
  allowedDomains: string[]
  allowedOrganisations: string[]
}

function formatEventTime(startTime: string): string {
  const date = new Date(startTime)
  const dayDate = date.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  return `${dayDate} · ${time}`
}

export default function EventCard({
  id,
  title,
  startTime,
  venue,
  capacity,
  registeredCount,
  isPaid,
  price,
  allowedDomains,
  allowedOrganisations,
}: EventCardProps) {
  return (
    <Link href={`/events/${id}`} className="block">
      <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-5">
        {/* Top row: title + price badge */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 leading-snug">{title}</h3>
          {isPaid && price != null
            ? (
              <span className="ml-3 shrink-0 text-sm font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                SGD {price.toFixed(2)}
              </span>
            )
            : (
              <span className="ml-3 shrink-0 text-sm font-medium bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                FREE
              </span>
            )
          }
        </div>

        {/* Date row */}
        <p className="text-sm text-gray-500 mb-1">{formatEventTime(startTime)}</p>

        {/* Venue row */}
        <p className="text-sm text-gray-500 mb-3">{venue || 'To Be Confirmed'}</p>

        {/* Capacity bar */}
        <div className="mb-3">
          <CapacityBar registered={registeredCount} capacity={capacity} />
        </div>

        {/* Eligibility restriction notice */}
        {allowedOrganisations.length > 0 && (
          <p className="text-xs text-amber-600 mb-3">
            Open to: {allowedOrganisations.join(', ')}
          </p>
        )}

        {/* View Details link */}
        <div className="text-sm font-medium text-blue-600 hover:text-blue-700">
          View Details →
        </div>
      </div>
    </Link>
  )
}
