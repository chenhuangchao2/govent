import { db } from '@/lib/db'
import { sendWaitlistPromotionEmail } from './email'

export async function promoteWaitlist(eventId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const next = await tx.registration.findFirst({
      where: { eventId, status: 'WAITLISTED' },
      orderBy: { createdAt: 'asc' },
      include: { event: true },
    })

    if (!next) return

    await tx.registration.update({
      where: { id: next.id },
      data: { status: 'PENDING', waitlistPosition: null },
    })

    // Renumber remaining waitlist
    const remaining = await tx.registration.findMany({
      where: { eventId, status: 'WAITLISTED' },
      orderBy: { createdAt: 'asc' },
    })

    for (let i = 0; i < remaining.length; i++) {
      await tx.registration.update({
        where: { id: remaining[i].id },
        data: { waitlistPosition: i + 1 },
      })
    }

    await tx.auditLog.create({
      data: {
        action: 'WAITLIST_PROMOTED',
        eventId,
        registrationId: next.id,
        metadata: { promotedEmail: next.email },
      },
    })

    // Email is best-effort, sent outside transaction
    sendWaitlistPromotionEmail({
      to: next.email,
      name: next.name,
      eventTitle: next.event.title,
    }).catch(console.error)
  })
}
