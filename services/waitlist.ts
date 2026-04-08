import { db } from '@/lib/db'
import { sendWaitlistPromotionEmail } from './email'

export async function promoteWaitlist(eventId: string): Promise<void> {
  const next = await db.registration.findFirst({
    where: { eventId, status: 'WAITLISTED' },
    orderBy: { createdAt: 'asc' },
    include: { event: true },
  })

  if (!next) return

  await db.registration.update({
    where: { id: next.id },
    data: { status: 'PENDING', waitlistPosition: null },
  })

  // Renumber remaining waitlist
  const remaining = await db.registration.findMany({
    where: { eventId, status: 'WAITLISTED' },
    orderBy: { createdAt: 'asc' },
  })

  for (let i = 0; i < remaining.length; i++) {
    await db.registration.update({
      where: { id: remaining[i].id },
      data: { waitlistPosition: i + 1 },
    })
  }

  await db.auditLog.create({
    data: {
      action: 'WAITLIST_PROMOTED',
      eventId,
      registrationId: next.id,
      metadata: { promotedEmail: next.email },
    },
  })

  await sendWaitlistPromotionEmail({
    to: next.email,
    name: next.name,
    eventTitle: next.event.title,
  })
}
