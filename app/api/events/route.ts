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
  const event = await db.event.create({
    data: {
      title: body.title,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      venue: body.venue,
      capacity: Number(body.capacity),
      registrationDeadline: new Date(body.registrationDeadline),
      allowedDomains: body.allowedDomains ?? [],
      allowedDepartments: body.allowedDepartments ?? [],
      isPaid: body.isPaid ?? false,
      price: body.isPaid ? Number(body.price) : null,
      paymentDeadlineHours: body.paymentDeadlineHours ?? 48,
      cpdHours: Number(body.cpdHours ?? 0),
    },
  })

  await logAction({ action: 'CREATE_EVENT', actorId: session.userId, eventId: event.id, req })
  return NextResponse.json({ data: event, error: null }, { status: 201 })
}
