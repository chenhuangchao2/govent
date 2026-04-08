import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  const entry = await db.blacklist.update({
    where: { id },
    data: { isActive: false, removedAt: new Date() },
  })
  await logAction({ action: 'BLACKLIST_REMOVE', actorId: session.userId, metadata: { email: entry.email }, req })
  return NextResponse.json({ data: entry, error: null })
}
