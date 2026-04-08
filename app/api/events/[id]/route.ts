import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sendCancellationEmail } from '@/services/email'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
  })
  if (!event) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: event, error: null })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'cancel') {
    const event = await db.event.update({ where: { id }, data: { isCancelled: true } })
    const registrations = await db.registration.findMany({
      where: { eventId: id, status: { in: ['PENDING', 'APPROVED', 'WAITLISTED'] } },
    })
    await Promise.allSettled(
      registrations.map(r =>
        sendCancellationEmail({ to: r.email, name: r.name, eventTitle: event.title })
      )
    )
    await logAction({ action: 'CANCEL_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  }

  if (body.action === 'publish') {
    const event = await db.event.update({ where: { id }, data: { isPublished: true } })
    await logAction({ action: 'PUBLISH_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  }

  if (body.action === 'unpublish') {
    const event = await db.event.update({ where: { id }, data: { isPublished: false } })
    await logAction({ action: 'UNPUBLISH_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  }

  // General update
  try {
    const event = await db.event.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        venue: body.venue,
        capacity: body.capacity ? Number(body.capacity) : undefined,
        registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : undefined,
        allowedDomains: body.allowedDomains ?? undefined,
        allowedDepartments: body.allowedDepartments ?? undefined,
        cpdHours: body.cpdHours != null ? Number(body.cpdHours) : undefined,
        isPaid: body.isPaid != null ? Boolean(body.isPaid) : undefined,
        price: body.price != null ? Number(body.price) : undefined,
      },
    })
    await logAction({ action: 'EDIT_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  } catch {
    return NextResponse.json({ data: null, error: 'Event not found' }, { status: 404 })
  }
}
