import { db } from '@/lib/db'
import EventCard from '@/components/features/EventCard'

export const revalidate = 30

export default async function EventsPage() {
  const events = await db.event.findMany({
    where: { isPublished: true, isCancelled: false },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
    orderBy: { startTime: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h1>
      {events.length === 0 && <p className="text-gray-500">No upcoming events.</p>}
      <div className="space-y-4">
        {events.map(e => (
          <EventCard
            key={e.id}
            id={e.id}
            title={e.title}
            startTime={e.startTime.toISOString()}
            venue={e.venue}
            venueHidden={e.venueHidden}
            capacity={e.capacity}
            registeredCount={e._count.registrations}
            isPaid={e.isPaid}
            price={e.price}
            allowedDomains={e.allowedDomains}
            allowedDepartments={e.allowedDepartments}
          />
        ))}
      </div>
    </div>
  )
}
