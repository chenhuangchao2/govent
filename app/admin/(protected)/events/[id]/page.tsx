import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EventActionButtons from '@/components/features/admin/EventActionButtons'
import EventEditForm from '@/components/features/admin/EventEditForm'

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  })
  if (!event) notFound()

  const statusLabel = event.isCancelled ? 'Cancelled' : event.isPublished ? 'Published' : 'Draft'
  const statusColor = event.isCancelled ? 'text-red-600' : event.isPublished ? 'text-green-600' : 'text-yellow-600'

  return (
    <div>
      <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        ← All Events
      </Link>

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {event.startTime.toLocaleDateString('en-SG', { dateStyle: 'full' })} · {event.venue}
          </p>
          <span className={`text-xs font-semibold mt-1 inline-block ${statusColor}`}>{statusLabel}</span>
        </div>
        <EventActionButtons
          eventId={id}
          isPublished={event.isPublished}
          isCancelled={event.isCancelled}
        />
      </div>

      <div className="flex gap-3 my-6">
        <Link href={`/admin/events/${id}/registrations`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Manage Registrations ({event._count.registrations})
        </Link>
        <Link href={`/admin/checkin/${id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          Start Check-in
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md text-sm text-gray-600">
        <div><span className="font-medium">Capacity:</span> {event.capacity}</div>
        <div><span className="font-medium">Total Registrations:</span> {event._count.registrations}</div>
        <div><span className="font-medium">CPD Hours:</span> {event.cpdHours}</div>
        {event.isPaid && <div><span className="font-medium">Price:</span> SGD {event.price}</div>}
      </div>

      <EventEditForm event={{
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        venue: event.venue,
        capacity: event.capacity,
        registrationDeadline: event.registrationDeadline.toISOString(),
        allowedDomains: event.allowedDomains,
        allowedDepartments: event.allowedDepartments,
        cpdHours: event.cpdHours,
        isPaid: event.isPaid,
        price: event.price,
        isCancelled: event.isCancelled,
      }} />
    </div>
  )
}
