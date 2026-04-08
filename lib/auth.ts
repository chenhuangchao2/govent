import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId?: string
  userEmail?: string
  userName?: string
  isSuperAdmin?: boolean
  isLoggedIn: boolean
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'govent-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return null
  }
  return session
}
