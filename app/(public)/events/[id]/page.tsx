import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id, isPublished: true, isCancelled: false },
    include: { _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } } },
  })
  if (!event) notFound()

  const available = event.capacity - event._count.registrations
  const isOpen = new Date() <= event.registrationDeadline

  return (
    <div className="max-w-2xl">
      <Link href="/events" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">← All Events</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
      <div className="space-y-1 text-sm text-gray-600 mb-6">
        <p>📅 {event.startTime.toLocaleDateString('en-SG', { dateStyle: 'full' })} · {event.startTime.toLocaleTimeString('en-SG', { timeStyle: 'short' })} – {event.endTime.toLocaleTimeString('en-SG', { timeStyle: 'short' })}</p>
        <p>📍 {event.venue}</p>
        <p>👥 {available > 0 ? `${available} of ${event.capacity} seats available` : `Full — waitlist open`}</p>
        {event.isPaid && <p>💳 SGD {event.price}</p>}
        {event.cpdHours > 0 && <p>🎓 {event.cpdHours} CPD hours</p>}
        {!isOpen && <p className="text-red-600 font-medium">Registration closed</p>}
      </div>
      <p className="text-gray-700 mb-6 whitespace-pre-wrap">{event.description}</p>
      {isOpen && (
        <Link href={`/register/${id}`} className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
          Register Now
        </Link>
      )}
    </div>
  )
}
