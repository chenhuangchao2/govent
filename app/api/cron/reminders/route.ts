import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendReminderEmail } from '@/services/email'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() + 47 * 3600 * 1000)
  const windowEnd = new Date(now.getTime() + 49 * 3600 * 1000)

  const events = await db.event.findMany({
    where: { startTime: { gte: windowStart, lte: windowEnd }, isPublished: true, isCancelled: false },
  })

  let sent = 0
  for (const event of events) {
    const registrations = await db.registration.findMany({
      where: { eventId: event.id, status: 'APPROVED', reminderSent: false },
    })
    for (const reg of registrations) {
      await sendReminderEmail({
        to: reg.email, name: reg.name, eventTitle: event.title,
        eventDate: event.startTime.toLocaleDateString('en-SG'), venue: event.venue,
      }).catch(console.error)
      await db.registration.update({ where: { id: reg.id }, data: { reminderSent: true } })
      sent++
    }
  }

  return NextResponse.json({ data: { sent }, error: null })
}
