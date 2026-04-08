import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run independent queries in parallel
    const [
      totalEvents,
      activeEvents,
      totalRegistrations,
      registrationsByStatus,
      organisationBreakdown,
      eventsForFillRate,
      cpdResult,
      upcomingEventsRaw,
    ] = await Promise.all([
      // 1. Total events
      db.event.count(),

      // 2. Active events (published + not cancelled)
      db.event.count({
        where: { isPublished: true, isCancelled: false },
      }),

      // 3. Total registrations
      db.registration.count(),

      // 4. Registrations by status (pie chart)
      db.registration.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // 5. Organisation breakdown
      db.registration.groupBy({
        by: ['organisation'],
        _count: { organisation: true },
      }),

      // 6. Events with registrations for fill rate calculation
      db.event.findMany({
        where: { isPublished: true, isCancelled: false },
        select: {
          title: true,
          capacity: true,
          _count: { select: { registrations: true } },
        },
      }),

      // 7. Total CPD hours from events where registrant ATTENDED
      db.registration.findMany({
        where: { status: 'ATTENDED' },
        select: {
          event: { select: { cpdHours: true } },
        },
      }),

      // 8. Upcoming events in next 14 days
      db.event.findMany({
        where: {
          isPublished: true,
          isCancelled: false,
          startTime: { gte: new Date(), lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          venue: true,
          capacity: true,
          isPaid: true,
          _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } },
        },
        orderBy: { startTime: 'asc' },
      }),
    ])

    // Format registrations by status
    const formattedRegistrationsByStatus = registrationsByStatus.map((r) => ({
      status: r.status,
      count: r._count.status,
    }))

    // Calculate fill rates (top 5)
    const eventFillRates = eventsForFillRate
      .map((e) => ({
        eventTitle: e.title,
        registered: e._count.registrations,
        capacity: e.capacity,
        fillRate: e.capacity > 0
          ? Math.round((e._count.registrations / e.capacity) * 100)
          : 0,
      }))
      .sort((a, b) => b.fillRate - a.fillRate)
      .slice(0, 5)

    // Format organisation breakdown
    const formattedOrganisationBreakdown = organisationBreakdown.map((d) => ({
      organisation: d.organisation,
      count: d._count.organisation,
    }))

    // Sum CPD hours
    const totalCpdHours = cpdResult.reduce(
      (sum, r) => sum + (r.event.cpdHours ?? 0),
      0
    )

    // Format upcoming events
    const upcomingEvents = upcomingEventsRaw.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
      venue: e.venue,
      registered: e._count.registrations,
      capacity: e.capacity,
      isPaid: e.isPaid,
    }))

    return NextResponse.json({
      data: {
        totalEvents,
        activeEvents,
        totalRegistrations,
        registrationsByStatus: formattedRegistrationsByStatus,
        eventFillRates,
        organisationBreakdown: formattedOrganisationBreakdown,
        totalCpdHours,
        upcomingEvents,
      },
      error: null,
    })
  } catch (err) {
    console.error('[Analytics API]', err)
    return NextResponse.json(
      { data: null, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
