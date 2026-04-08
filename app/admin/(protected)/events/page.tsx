import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Link from 'next/link'

export default async function AdminEventsPage() {
  const session = await requireAdmin()
  const isSuperAdmin = session?.isSuperAdmin ?? false

  const events = await db.event.findMany({
    where: isSuperAdmin ? {} : { creatorId: session?.userId },
    include: {
      _count: { select: { registrations: true } },
      creator: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  function capacityColor(registered: number, capacity: number): string {
    const pct = capacity > 0 ? registered / capacity : 0
    if (pct > 0.9) return 'text-red-600 font-medium'
    if (pct >= 0.7) return 'text-amber-600 font-medium'
    return 'text-green-600 font-medium'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          href="/admin/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Event
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <p className="text-base mb-3">No events yet.</p>
            <Link
              href="/admin/events/new"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Create your first event →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Title', 'Date & Time', 'Capacity', ...(isSuperAdmin ? ['Created By'] : []), 'Status'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  {/* Title — clickable link */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${e.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {e.title}
                    </Link>
                  </td>

                  {/* Date & Time */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {e.startTime.toLocaleString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>

                  {/* Capacity: X / Y with color */}
                  <td className={`px-4 py-3 ${capacityColor(e._count.registrations, e.capacity)}`}>
                    {e._count.registrations} / {e.capacity}
                  </td>

                  {/* Created By (super admin only) */}
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-gray-500">
                      {e.creator?.name || '—'}
                    </td>
                  )}

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.isCancelled
                          ? 'bg-red-100 text-red-700'
                          : e.isPublished
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {e.isCancelled ? 'Cancelled' : e.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
