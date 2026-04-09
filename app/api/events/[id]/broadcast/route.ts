import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sendBroadcastEmail } from '@/services/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params
  const body = await req.json()
  const { subject, message } = body

  if (!subject || !subject.trim()) {
    return NextResponse.json(
      { data: null, error: 'Subject is required' },
      { status: 400 }
    )
  }

  if (!message || !message.trim()) {
    return NextResponse.json(
      { data: null, error: 'Message is required' },
      { status: 400 }
    )
  }

  const event = await db.event.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json(
      { data: null, error: 'Event not found' },
      { status: 404 }
    )
  }
  if (!session.isSuperAdmin && event.creatorId !== session.userId) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const registrations = await db.registration.findMany({
    where: {
      eventId: id,
      status: { in: ['APPROVED', 'WAITLISTED'] },
    },
  })

  const results = await Promise.allSettled(
    registrations.map((reg) =>
      sendBroadcastEmail({
        to: reg.email,
        name: reg.name,
        eventTitle: event.title,
        subject: subject.trim(),
        message: message.trim(),
      })
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  await logAction({
    action: 'BROADCAST',
    actorId: session.userId,
    eventId: id,
    metadata: { subject, recipientCount: registrations.length },
    req,
  })

  return NextResponse.json({
    data: { sent, failed },
    error: null,
  })
}
