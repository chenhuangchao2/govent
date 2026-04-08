import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [approved, attended, lastFive] = await Promise.all([
    db.registration.count({
      where: { eventId: id, status: 'APPROVED' },
    }),
    db.registration.count({
      where: { eventId: id, status: 'ATTENDED' },
    }),
    db.registration.findMany({
      where: { eventId: id, status: 'ATTENDED' },
      orderBy: { checkedInAt: 'desc' },
      take: 5,
      select: { name: true, checkedInAt: true },
    }),
  ])

  return NextResponse.json({
    data: {
      approved,
      attended,
      total: approved + attended,
      remaining: approved,
      lastFive: lastFive.map((r) => ({
        name: r.name,
        checkedInAt: r.checkedInAt?.toISOString() ?? '',
      })),
    },
    error: null,
  })
}
