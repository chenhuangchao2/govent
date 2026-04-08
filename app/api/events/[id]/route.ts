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

  // General update — only include fields that are actually present in the body
  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.startTime !== undefined) data.startTime = new Date(body.startTime)
  if (body.endTime !== undefined) data.endTime = new Date(body.endTime)
  if (body.venue !== undefined) data.venue = body.venue
  if (body.venueHidden !== undefined) data.venueHidden = Boolean(body.venueHidden)
  if (body.capacity !== undefined) data.capacity = Number(body.capacity)
  if (body.registrationDeadline !== undefined) data.registrationDeadline = new Date(body.registrationDeadline)
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null
  if (body.tags !== undefined) data.tags = body.tags
  if (body.allowedDomains !== undefined) data.allowedDomains = body.allowedDomains
  if (body.allowedOrganisations !== undefined) data.allowedOrganisations = body.allowedOrganisations
  if (body.cpdHours !== undefined) data.cpdHours = Number(body.cpdHours)
  if (body.isPaid !== undefined) data.isPaid = Boolean(body.isPaid)
  if (body.price !== undefined) data.price = body.price != null ? Number(body.price) : null

  // Validate date logic if time fields are being updated
  if (data.startTime || data.endTime || data.registrationDeadline) {
    const existing = await db.event.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ data: null, error: 'Event not found' }, { status: 404 })

    const start = (data.startTime as Date) || existing.startTime
    const end = (data.endTime as Date) || existing.endTime
    const deadline = (data.registrationDeadline as Date) || existing.registrationDeadline

    if (end <= start) {
      return NextResponse.json({ data: null, error: 'End time must be after start time' }, { status: 400 })
    }
    if (deadline >= start) {
      return NextResponse.json({ data: null, error: 'Registration deadline must be before event start time' }, { status: 400 })
    }
  }

  if (data.capacity !== undefined && (data.capacity as number) <= 0) {
    return NextResponse.json({ data: null, error: 'Capacity must be greater than 0' }, { status: 400 })
  }

  try {
    const event = await db.event.update({ where: { id }, data })
    await logAction({ action: 'EDIT_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  } catch (err) {
    console.error('Event update error:', err)
    return NextResponse.json({ data: null, error: 'Failed to update event' }, { status: 500 })
  }
}
