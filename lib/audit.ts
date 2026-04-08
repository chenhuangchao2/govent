import { db } from './db'
import { NextRequest } from 'next/server'

export async function logAction(opts: {
  action: string
  actorId?: string
  eventId?: string
  registrationId?: string
  metadata?: Record<string, unknown>
  req?: NextRequest
}) {
  await db.auditLog.create({
    data: {
      action: opts.action,
      actorId: opts.actorId,
      eventId: opts.eventId,
      registrationId: opts.registrationId,
      metadata: opts.metadata,
      ipAddress: opts.req?.headers.get('x-forwarded-for') ?? opts.req?.headers.get('x-real-ip') ?? null,
    },
  })
}
