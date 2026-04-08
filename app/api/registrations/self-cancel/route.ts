import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAction } from '@/lib/audit'
import { promoteWaitlist } from '@/services/waitlist'

export async function POST(req: NextRequest) {
  const { registrationId, email } = await req.json()
  if (!registrationId || !email) {
    return NextResponse.json({ data: null, error: 'registrationId and email required' }, { status: 400 })
  }

  const reg = await db.registration.findUnique({ where: { id: registrationId } })
  if (!reg) return NextResponse.json({ data: null, error: 'Registration not found' }, { status: 404 })

  if (reg.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ data: null, error: 'Email does not match' }, { status: 403 })
  }

  const cancellable = ['PENDING', 'APPROVED', 'WAITLISTED', 'PENDING_PAYMENT']
  if (!cancellable.includes(reg.status)) {
    return NextResponse.json({ data: null, error: `Cannot cancel registration with status ${reg.status}` }, { status: 400 })
  }

  const updated = await db.registration.update({
    where: { id: registrationId },
    data: { status: 'CANCELLED' },
  })

  if (['APPROVED', 'PENDING'].includes(reg.status)) {
    await promoteWaitlist(reg.eventId)
  }

  await logAction({ action: 'SELF_CANCEL', registrationId, metadata: { email } })
  return NextResponse.json({ data: updated, error: null })
}
