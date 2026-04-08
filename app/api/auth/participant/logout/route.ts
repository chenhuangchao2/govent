import { NextResponse } from 'next/server'
import { getParticipantSession } from '@/lib/participant-auth'

export async function POST() {
  try {
    const session = await getParticipantSession()
    session.destroy()

    return NextResponse.json({ data: { ok: true }, error: null })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
