import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sendCancellationEmail } from '@/services/email'

// GET /api/events — public list of published events
export async function GET() {
  const events = await db.event.findMany({
    where: { isPublished: true, isCancelled: false },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json({ data: events, error: null })
}

// POST /api/events — admin creates event
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Validate required fields
  if (!body.title || !body.startTime || !body.endTime || !body.venue || !body.capacity || !body.registrationDeadline) {
    return NextResponse.json({ data: null, error: 'Missing required fields' }, { status: 400 })
  }

  // Validate date logic
  const startTime = new Date(body.startTime)
  const endTime = new Date(body.endTime)
  const registrationDeadline = new Date(body.registrationDeadline)

  if (endTime <= startTime) {
    return NextResponse.json({ data: null, error: 'End time must be after start time' }, { status: 400 })
  }
  if (registrationDeadline >= startTime) {
    return NextResponse.json({ data: null, error: 'Registration deadline must be before event start time' }, { status: 400 })
  }
  if (Number(body.capacity) <= 0) {
    return NextResponse.json({ data: null, error: 'Capacity must be greater than 0' }, { status: 400 })
  }
  if (body.isPaid && (!body.price || Number(body.price) <= 0)) {
    return NextResponse.json({ data: null, error: 'Paid events must have a price greater than 0' }, { status: 400 })
  }

  const event = await db.event.create({
    data: {
      title: body.title,
      description: body.description,
      startTime,
      endTime,
      venue: body.venue,
      capacity: Number(body.capacity),
      registrationDeadline,
      allowedDomains: body.allowedDomains ?? [],
      allowedOrganisations: body.allowedOrganisations ?? [],
      isPaid: body.isPaid ?? false,
      price: body.isPaid ? Number(body.price) : null,
      paymentDeadlineHours: body.paymentDeadlineHours ?? 48,
      cpdHours: Number(body.cpdHours ?? 0),
    },
  })

  await logAction({ action: 'CREATE_EVENT', actorId: session.userId, eventId: event.id, req })
  return NextResponse.json({ data: event, error: null }, { status: 201 })
}
