import { NextResponse } from 'next/server'
import { getParticipantSession } from '@/lib/participant-auth'

export async function GET() {
  try {
    const session = await getParticipantSession()

    if (!session.isLoggedIn) {
      return NextResponse.json({ data: null, error: null })
    }

    return NextResponse.json({
      data: {
        participantId: session.participantId,
        email: session.email,
        name: session.name,
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
