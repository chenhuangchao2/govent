import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json({ data: null, error: 'eventId required' }, { status: 400 })

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ data: null, error: 'Event not found' }, { status: 404 })
  if (!session.isSuperAdmin && event.creatorId !== session.userId) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const registrations = await db.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
  })

  const header = 'Name,Email,Organisation,Status,Registered At,Checked In At,CPD Hours'
  const rows = registrations.map(r => {
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`
    return [
      escapeCsv(r.name),
      escapeCsv(r.email),
      escapeCsv(r.organisation),
      r.status,
      r.createdAt.toISOString(),
      r.checkedInAt?.toISOString() ?? '',
      r.status === 'ATTENDED' ? event.cpdHours.toString() : '0',
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')
  const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '-')}-registrations.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
