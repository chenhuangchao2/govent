import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import CheckinScanner from '@/components/features/admin/CheckinScanner'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id } })
  if (!event) notFound()

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">Check-in mode · {event.startTime.toLocaleDateString('en-SG')}</p>
      <CheckinScanner eventId={id} />
    </div>
  )
}
