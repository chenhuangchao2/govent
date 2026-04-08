import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import RegistrationForm from '@/components/features/RegistrationForm'

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id, isPublished: true, isCancelled: false } })
  if (!event) notFound()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {event.startTime.toLocaleDateString('en-SG', { dateStyle: 'long' })} · {event.venue}
      </p>
      <RegistrationForm eventId={id} eventTitle={event.title} />
    </div>
  )
}
