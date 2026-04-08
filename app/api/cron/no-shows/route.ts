import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { incrementNoShow } from '@/services/blacklist'
import { logAction } from '@/lib/audit'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const events = await db.event.findMany({
    where: { endTime: { lt: new Date() }, noShowProcessed: false, isCancelled: false },
  })

  let processed = 0
  for (const event of events) {
    const noShows = await db.registration.findMany({
      where: { eventId: event.id, status: 'APPROVED' },
    })
    for (const reg of noShows) {
      await db.registration.update({ where: { id: reg.id }, data: { status: 'NO_SHOW' } })
      await incrementNoShow(reg.email, reg.name)
      await logAction({ action: 'NO_SHOW_MARKED', registrationId: reg.id, eventId: event.id })
      processed++
    }
    await db.event.update({ where: { id: event.id }, data: { noShowProcessed: true } })
  }

  return NextResponse.json({ data: { processed }, error: null })
}
