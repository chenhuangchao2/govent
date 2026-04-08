import { NextResponse } from 'next/server'
import { getParticipantSession } from '@/lib/participant-auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getParticipantSession()

    if (!session.isLoggedIn || !session.participantId) {
      return NextResponse.json({ data: null, error: null })
    }

    const participant = await db.participant.findUnique({
      where: { id: session.participantId },
      select: { organisation: true },
    })

    return NextResponse.json({
      data: {
        participantId: session.participantId,
        email: session.email,
        name: session.name,
        organisation: participant?.organisation ?? null,
      },
      error: null,
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
