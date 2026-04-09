import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getParticipantSession } from '@/lib/participant-auth'

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, code } = await req.json()
    const email = rawEmail?.toLowerCase().trim()

    if (!email || !code) {
      return NextResponse.json(
        { data: null, error: 'Email and code are required' },
        { status: 400 }
      )
    }

    const participant = await db.participant.findUnique({ where: { email } })

    if (
      !participant ||
      participant.verificationCode !== code ||
      !participant.codeExpiresAt ||
      participant.codeExpiresAt < new Date()
    ) {
      return NextResponse.json(
        { data: null, error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark as verified and clear the code
    await db.participant.update({
      where: { email },
      data: {
        isVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    })

    // Create session
    const session = await getParticipantSession()
    session.participantId = participant.id
    session.email = participant.email
    session.name = participant.name
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({ data: { name: participant.name }, error: null })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
