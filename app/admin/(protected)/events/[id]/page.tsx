import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  })
  if (!event) notFound()

  return (
    <div>
      <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">← All Events</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{event.startTime.toLocaleDateString('en-SG', { dateStyle: 'full' })} · {event.venue}</p>
      <div className="flex gap-3 mb-8">
        <Link href={`/admin/events/${id}/registrations`} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Manage Registrations ({event._count.registrations})
        </Link>
        <Link href={`/admin/checkin/${id}`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          Start Check-in
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-md text-sm text-gray-600">
        <div><span className="font-medium">Capacity:</span> {event.capacity}</div>
        <div><span className="font-medium">Total Registrations:</span> {event._count.registrations}</div>
        <div><span className="font-medium">Status:</span> {event.isCancelled ? 'Cancelled' : event.isPublished ? 'Published' : 'Draft'}</div>
        <div><span className="font-medium">CPD Hours:</span> {event.cpdHours}</div>
        {event.isPaid && <div><span className="font-medium">Price:</span> SGD {event.price}</div>}
      </div>
    </div>
  )
}
