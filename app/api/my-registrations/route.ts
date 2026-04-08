import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getParticipantSession } from '@/lib/participant-auth'

export async function GET(req: NextRequest) {
  const session = await getParticipantSession()
  if (!session.isLoggedIn || !session.email) {
    return NextResponse.json({ data: [], error: 'Not authenticated' }, { status: 401 })
  }
  const email = session.email

  const registrations = await db.registration.findMany({
    where: { email },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          venue: true,
          cpdHours: true,
          isPaid: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ data: registrations, error: null })
}
