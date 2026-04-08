import { db } from '@/lib/db'
import { sendBlacklistNotification } from './email'

const THRESHOLD = 5

export async function checkBlacklist(email: string): Promise<boolean> {
  const entry = await db.blacklist.findUnique({ where: { email } })
  return !!(entry && entry.isActive)
}

export async function incrementNoShow(email: string, name: string): Promise<void> {
  const existing = await db.blacklist.findUnique({ where: { email } })

  if (existing) {
    const updated = await db.blacklist.update({
      where: { email },
      data: { noShowCount: { increment: 1 } },
    })
    if (updated.noShowCount >= THRESHOLD && !updated.isActive) {
      await db.blacklist.update({
        where: { email },
        data: { isActive: true, source: 'AUTO_NO_SHOW', removedAt: null },
      })
      await sendBlacklistNotification({
        to: email,
        name,
        reason: `You have missed ${updated.noShowCount} registered events.`,
      })
    }
  } else {
    const created = await db.blacklist.create({
      data: { email, reason: 'Auto-flagged for no-show', source: 'AUTO_NO_SHOW', noShowCount: 1 },
    })
    if (created.noShowCount >= THRESHOLD) {
      await sendBlacklistNotification({
        to: email,
        name,
        reason: `You have missed ${created.noShowCount} registered events.`,
      })
    }
  }
}
