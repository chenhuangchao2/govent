import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const reg = await db.registration.findUnique({ where: { id }, include: { event: true } })

  if (!reg) return NextResponse.json({ data: null, error: 'Registration not found' }, { status: 404 })

  // Validate event match
  if (body.eventId && reg.eventId !== body.eventId) {
    return NextResponse.json({ data: null, error: 'QR code is for a different event' }, { status: 400 })
  }

  if (reg.status === 'ATTENDED') {
    const time = reg.checkedInAt?.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
    return NextResponse.json({ data: null, error: `Already checked in at ${time}` }, { status: 400 })
  }

  if (reg.status !== 'APPROVED') {
    return NextResponse.json({ data: null, error: 'Registration is not approved' }, { status: 400 })
  }

  const updated = await db.registration.update({
    where: { id },
    data: { status: 'ATTENDED', checkedInAt: new Date() },
  })

  await logAction({ action: 'CHECKIN', actorId: session.userId, eventId: reg.eventId, registrationId: id, req })
  return NextResponse.json({ data: { name: reg.name, checkedInAt: updated.checkedInAt }, error: null })
}
