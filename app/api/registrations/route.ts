import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { checkBlacklist } from '@/services/blacklist'
import { sendRegistrationConfirmation } from '@/services/email'

// GET /api/registrations — admin only, filterable by eventId and status
export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')
  const status = searchParams.get('status')

  const registrations = await db.registration.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(status ? { status: status as any } : {}),
    },
    include: { event: { select: { title: true, startTime: true, isPaid: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: registrations, error: null })
}

// POST /api/registrations — participant submits
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { eventId, name, email, organisation, remarks } = body

  if (!eventId || !name || !email || !organisation) {
    return NextResponse.json({ data: null, error: 'Missing required fields' }, { status: 400 })
  }

  // Check 1: Blacklist
  const isBlacklisted = await checkBlacklist(email)
  if (isBlacklisted) {
    return NextResponse.json({ data: null, error: 'Please contact the organiser to register.' }, { status: 403 })
  }

  // Fetch event
  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event || !event.isPublished || event.isCancelled) {
    return NextResponse.json({ data: null, error: 'Event not found' }, { status: 404 })
  }

  // Check 2: Eligibility (email domain)
  if (event.allowedDomains.length > 0) {
    const domain = email.split('@')[1]
    if (!event.allowedDomains.includes(domain)) {
      return NextResponse.json({
        data: null,
        error: `This event is restricted to: ${event.allowedDomains.join(', ')}`,
      }, { status: 400 })
    }
  }

  // Check 2b: Eligibility (organisation)
  if (event.allowedOrganisations.length > 0 && !event.allowedOrganisations.includes(organisation)) {
    return NextResponse.json({
      data: null,
      error: `This event is restricted to: ${event.allowedOrganisations.join(', ')} organisations`,
    }, { status: 400 })
  }

  // Check 3: Registration deadline
  if (new Date() > event.registrationDeadline) {
    return NextResponse.json({ data: null, error: 'Registration has closed for this event' }, { status: 400 })
  }

  // Check 4: Duplicate — allow re-registration if previous was CANCELLED or REJECTED
  const existing = await db.registration.findUnique({ where: { eventId_email: { eventId, email } } })
  if (existing) {
    if (existing.status === 'CANCELLED' || existing.status === 'REJECTED') {
      // Re-register: reset the existing record
      const registration = await db.$transaction(async (tx) => {
        const count = await tx.registration.count({
          where: { eventId, status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } },
        })
        const regStatus = count >= event.capacity ? 'WAITLISTED' : 'PENDING'
        const waitlistPosition = regStatus === 'WAITLISTED'
          ? await tx.registration.count({ where: { eventId, status: 'WAITLISTED' } }) + 1
          : null

        const reg = await tx.registration.update({
          where: { id: existing.id },
          data: {
            name, organisation, remarks,
            status: regStatus,
            waitlistPosition,
            paymentStatus: 'NOT_REQUIRED',
            stripeSessionId: null,
            paymentDeadline: null,
            paidAt: null,
            checkedInAt: null,
            adminNotes: null,
          },
        })

        await tx.auditLog.create({
          data: { action: 'RE_REGISTER', eventId, registrationId: reg.id, metadata: { email, status: regStatus, previousStatus: existing.status } },
        })

        return reg
      })

      await sendRegistrationConfirmation({
        to: email, name, eventTitle: event.title,
        eventDate: event.startTime.toLocaleDateString('en-SG'), status: registration.status,
      }).catch(console.error)

      return NextResponse.json({ data: registration, error: null }, { status: 201 })
    }
    return NextResponse.json({ data: null, error: 'You are already registered for this event' }, { status: 400 })
  }

  // Check 5: Capacity (transactional)
  const registration = await db.$transaction(async (tx) => {
    const count = await tx.registration.count({
      where: { eventId, status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } },
    })

    const regStatus = count >= event.capacity ? 'WAITLISTED' : 'PENDING'
    const waitlistPosition = regStatus === 'WAITLISTED'
      ? await tx.registration.count({ where: { eventId, status: 'WAITLISTED' } }) + 1
      : null

    const reg = await tx.registration.create({
      data: {
        eventId, name, email, organisation, remarks,
        status: regStatus,
        waitlistPosition,
        paymentStatus: 'NOT_REQUIRED',
      },
    })

    await tx.auditLog.create({
      data: { action: 'REGISTER', eventId, registrationId: reg.id, metadata: { email, status: regStatus } },
    })

    return reg
  })

  // Send confirmation email (best-effort)
  await sendRegistrationConfirmation({
    to: email,
    name,
    eventTitle: event.title,
    eventDate: event.startTime.toLocaleDateString('en-SG'),
    status: registration.status,
  }).catch(console.error)

  return NextResponse.json({ data: registration, error: null }, { status: 201 })
}
