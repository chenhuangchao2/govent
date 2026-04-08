import { db } from '@/lib/db'
import EventFilters from '@/components/features/EventFilters'

export const revalidate = 30

export default async function EventsPage() {
  const events = await db.event.findMany({
    where: { isPublished: true, isCancelled: false },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
    orderBy: { startTime: 'asc' },
  })

  const serialized = events.map(e => ({
    id: e.id,
    title: e.title,
    startTime: e.startTime.toISOString(),
    venue: e.venue,
    capacity: e.capacity,
    registeredCount: e._count.registrations,
    isPaid: e.isPaid,
    price: e.price,
    allowedDomains: e.allowedDomains,
    allowedOrganisations: e.allowedOrganisations,
    tags: e.tags,
    imageUrl: e.imageUrl,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Events</h1>
      {serialized.length === 0 ? (
        <p className="text-gray-500">No events available.</p>
      ) : (
        <EventFilters events={serialized} />
      )}
    </div>
  )
}
