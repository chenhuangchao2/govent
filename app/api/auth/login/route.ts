import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const user = await db.user.findUnique({ where: { email } })
  const hash = createHash('sha256').update(password).digest('hex')

  if (!user || user.passwordHash !== hash) {
    return NextResponse.json({ data: null, error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await getSession()
  session.isLoggedIn = true
  session.userId = user.id
  session.userEmail = user.email
  session.userName = user.name
  await session.save()

  return NextResponse.json({ data: { name: user.name, email: user.email }, error: null })
}
