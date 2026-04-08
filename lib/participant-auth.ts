import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface ParticipantSession {
  participantId?: string
  email?: string
  name?: string
  isLoggedIn: boolean
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'govent-participant',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

export async function getParticipantSession() {
  const cookieStore = await cookies()
  return getIronSession<ParticipantSession>(cookieStore, sessionOptions)
}

export async function requireParticipant() {
  const session = await getParticipantSession()
  if (!session.isLoggedIn) return null
  return session
}
