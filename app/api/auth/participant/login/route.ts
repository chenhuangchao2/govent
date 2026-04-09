import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getParticipantSession } from '@/lib/participant-auth'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, password } = await req.json()
    const email = rawEmail?.toLowerCase().trim()

    if (!email || !password) {
      return NextResponse.json(
        { data: null, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const participant = await db.participant.findUnique({ where: { email } })

    if (!participant) {
      return NextResponse.json(
        { data: null, error: 'Account not found' },
        { status: 404 }
      )
    }

    if (!participant.isVerified) {
      return NextResponse.json(
        { data: null, error: 'Please verify your email first' },
        { status: 403 }
      )
    }

    const hash = createHash('sha256').update(password).digest('hex')
    if (participant.passwordHash !== hash) {
      return NextResponse.json(
        { data: null, error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create session
    const session = await getParticipantSession()
    session.participantId = participant.id
    session.email = participant.email
    session.name = participant.name
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({ data: { name: participant.name }, error: null })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
