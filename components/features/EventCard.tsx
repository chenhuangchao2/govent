import Link from 'next/link'

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
  allowedDepartments: string[]
}

export default function EventCard({ id, title, startTime, venue, capacity, registeredCount, isPaid, price, allowedDomains, allowedDepartments }: EventCardProps) {
  const available = capacity - registeredCount
  const isFull = available <= 0
  const eligibilityLabel = allowedDomains.length > 0
    ? `${allowedDomains.join(', ')} only`
    : allowedDepartments.length > 0
    ? `${allowedDepartments.join(', ')} dept only`
    : null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isPaid && price
          ? <span className="text-sm font-medium text-purple-700">SGD {price}</span>
          : <span className="text-sm text-green-700">Free</span>
        }
      </div>
      <p className="text-sm text-gray-500 mb-1">📅 {new Date(startTime).toLocaleDateString('en-SG', { dateStyle: 'full' })}</p>
      <p className="text-sm text-gray-500 mb-3">📍 {venue}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isFull ? 'text-red-600' : 'text-gray-700'}`}>
            {isFull ? 'Full — waitlist available' : `${available} / ${capacity} seats left`}
          </span>
          {eligibilityLabel && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{eligibilityLabel}</span>
          )}
        </div>
        <Link href={`/events/${id}`} className="text-sm text-blue-600 hover:underline font-medium">
          View →
        </Link>
      </div>
    </div>
  )
}
