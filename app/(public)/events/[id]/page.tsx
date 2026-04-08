import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CapacityBar from '@/components/features/CapacityBar'
import DeadlineCountdown from '@/components/features/DeadlineCountdown'
import EventRegistrationStatus from '@/components/features/EventRegistrationStatus'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id, isPublished: true, isCancelled: false },
    include: {
      _count: {
        select: {
          registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } },
        },
      },
    },
  })
  if (!event) notFound()

  const registered = event._count.registrations
  const available = event.capacity - registered
  const isFull = available <= 0
  const isPastDeadline = new Date() > event.registrationDeadline

  // Format date range: "Fri, 11 Apr 2026 · 2:00 PM – 4:00 PM"
  const dateLabel = event.startTime.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const startTimeLabel = event.startTime.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const endTimeLabel = event.endTime.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const dateTimeLabel = `${dateLabel} · ${startTimeLabel} – ${endTimeLabel}`

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/events" className="text-sm text-gray-500 hover:text-gray-700 inline-block">
        ← All Events
      </Link>

      {/* Title + badges */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              event.isPaid
                ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {event.isPaid ? 'PAID' : 'FREE'}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Published
          </span>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Date & Time */}
        <div className="px-5 py-4 flex gap-3">
          <span className="text-gray-400 mt-0.5">📅</span>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Date &amp; Time</p>
            <p className="text-sm text-gray-700">{dateTimeLabel}</p>
          </div>
        </div>

        {/* Venue */}
        <div className="px-5 py-4 flex gap-3">
          <span className="text-gray-400 mt-0.5">📍</span>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Venue</p>
            <p className="text-sm text-gray-700">{event.venue || 'To Be Confirmed'}</p>
          </div>
        </div>

        {/* Capacity */}
        <div className="px-5 py-4 flex gap-3">
          <span className="text-gray-400 mt-0.5">👥</span>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Capacity</p>
            <CapacityBar registered={registered} capacity={event.capacity} />
          </div>
        </div>

        {/* CPD Hours — only if > 0 */}
        {event.cpdHours > 0 && (
          <div className="px-5 py-4 flex gap-3">
            <span className="text-gray-400 mt-0.5">🎓</span>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">CPD Hours</p>
              <p className="text-sm text-gray-700">{event.cpdHours} CPD hours</p>
            </div>
          </div>
        )}

        {/* Price — only if paid */}
        {event.isPaid && (
          <div className="px-5 py-4 flex gap-3">
            <span className="text-gray-400 mt-0.5">💳</span>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Price</p>
              <p className="text-sm text-gray-700">SGD {event.price?.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Eligibility — only if organisation restricted */}
        {event.allowedOrganisations.length > 0 && (
          <div className="px-5 py-4 flex gap-3">
            <span className="text-gray-400 mt-0.5">🔒</span>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Eligibility</p>
              <p className="text-sm text-gray-700">Open to: {event.allowedOrganisations.join(', ')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Deadline countdown */}
      <DeadlineCountdown deadline={event.registrationDeadline.toISOString()} />

      {/* Description */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">About this event</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
      </div>

      {/* CTA — shows registration status if already registered, or register/waitlist button */}
      <EventRegistrationStatus
        eventId={id}
        isFull={isFull}
        isPastDeadline={isPastDeadline}
      />
    </div>
  )
}
