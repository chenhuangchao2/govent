import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promoteWaitlist } from '@/services/waitlist'
import { incrementNoShow } from '@/services/blacklist'
import { logAction } from '@/lib/audit'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const expired = await db.registration.findMany({
    where: { status: 'PENDING_PAYMENT', paymentDeadline: { lt: new Date() } },
  })

  for (const reg of expired) {
    await db.registration.update({ where: { id: reg.id }, data: { status: 'PAYMENT_FAILED', paymentStatus: 'FAILED' } })
    await promoteWaitlist(reg.eventId)
    await incrementNoShow(reg.email, reg.name)
    await logAction({ action: 'PAYMENT_TIMEOUT', registrationId: reg.id, eventId: reg.eventId })
  }

  return NextResponse.json({ data: { processed: expired.length }, error: null })
}
