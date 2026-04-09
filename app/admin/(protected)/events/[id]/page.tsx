import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import EventActionButtons from '@/components/features/admin/EventActionButtons'
import EventOverview from '@/components/features/admin/EventOverview'
import EventDetailTabs from '@/components/features/admin/EventDetailTabs'
import RegistrationsPanel from '@/components/features/admin/RegistrationsPanel'
import CheckinScanner from '@/components/features/admin/CheckinScanner'
import BroadcastModal from '@/components/features/admin/BroadcastModal'

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  })
  if (!event) notFound()
  if (!session.isSuperAdmin && event.creatorId !== session.userId) notFound()

  const statusLabel = event.isCancelled ? 'Cancelled' : event.isPublished ? 'Published' : 'Draft'
  const statusColor = event.isCancelled
    ? 'bg-red-100 text-red-700'
    : event.isPublished
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700'

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'registrations', label: 'Registrations', count: event._count.registrations },
    { key: 'checkin', label: 'Check-in' },
  ]

  return (
    <div>
      <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        ← All Events
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {event.startTime.toLocaleDateString('en-SG', { dateStyle: 'full' })} · {event.venue}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BroadcastModal eventId={id} eventTitle={event.title} />
          <EventActionButtons
            eventId={id}
            isPublished={event.isPublished}
            isCancelled={event.isCancelled}
          />
        </div>
      </div>

      <EventDetailTabs tabs={tabs}>
        {/* Overview tab */}
        <EventOverview event={{
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          venue: event.venue,
          capacity: event.capacity,
          registrationDeadline: event.registrationDeadline.toISOString(),
          imageUrl: event.imageUrl,
          tags: event.tags,
          allowedDomains: event.allowedDomains,
          allowedOrganisations: event.allowedOrganisations,
          cpdHours: event.cpdHours,
          isPaid: event.isPaid,
          price: event.price,
          isCancelled: event.isCancelled,
        }} />

        {/* Registrations tab */}
        <RegistrationsPanel eventId={id} />

        {/* Check-in tab */}
        <CheckinScanner eventId={id} />
      </EventDetailTabs>
    </div>
  )
}
