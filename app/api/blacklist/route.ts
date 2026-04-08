import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  const entries = await db.blacklist.findMany({ orderBy: { addedAt: 'desc' } })
  return NextResponse.json({ data: entries, error: null })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  const { email, reason } = await req.json()
  if (!email || !reason) return NextResponse.json({ data: null, error: 'email and reason required' }, { status: 400 })

  const entry = await db.blacklist.upsert({
    where: { email },
    update: { isActive: true, reason, source: 'MANUAL', removedAt: null },
    create: { email, reason, source: 'MANUAL' },
  })
  await logAction({ action: 'BLACKLIST_ADD', actorId: session.userId, metadata: { email, reason }, req })
  return NextResponse.json({ data: entry, error: null }, { status: 201 })
}
