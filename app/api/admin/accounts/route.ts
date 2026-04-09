import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getSession } from '@/lib/auth'

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!session.isSuperAdmin) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: users })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!session.isSuperAdmin) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })

  const body = await req.json()
  const { email, name, password } = body

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An admin with this email already exists' }, { status: 409 })
  }

  const { createHash } = await import('crypto')
  const passwordHash = createHash('sha256').update(password).digest('hex')

  const user = await db.user.create({
    data: { email, name, passwordHash, isSuperAdmin: false },
    select: { id: true, email: true, name: true, isSuperAdmin: true, createdAt: true },
  })

  return NextResponse.json({ data: user }, { status: 201 })
}

export async function PATCH(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!session.isSuperAdmin) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })

  const body = await req.json()
  const { userId, action, password } = body

  const target = await db.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (action === 'reset-password') {
    if (!password) return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    const { createHash } = await import('crypto')
    const passwordHash = createHash('sha256').update(password).digest('hex')
    await db.user.update({ where: { id: userId }, data: { passwordHash } })
    return NextResponse.json({ data: { message: 'Password reset successfully' } })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
