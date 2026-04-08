import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email) return NextResponse.json({ data: [], error: null })

  const registrations = await db.registration.findMany({
    where: { email },
    include: {
      event: {
        select: {
          title: true,
          startTime: true,
          venue: true,
          venueHidden: true,
          cpdHours: true,
          isPaid: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ data: registrations, error: null })
}
