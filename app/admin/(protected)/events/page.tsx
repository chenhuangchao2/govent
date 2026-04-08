import { db } from '@/lib/db'
import Link from 'next/link'

export default async function AdminEventsPage() {
  const events = await db.event.findMany({
    include: { _count: { select: { registrations: true } } },
    orderBy: { startTime: 'asc' },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link href="/admin/events/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Event
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Title', 'Date', 'Registrations', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.title}</td>
                <td className="px-4 py-3 text-gray-500">{e.startTime.toLocaleDateString('en-SG')}</td>
                <td className="px-4 py-3 text-gray-500">{e._count.registrations}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.isCancelled ? 'bg-red-100 text-red-700' :
                    e.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {e.isCancelled ? 'Cancelled' : e.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${e.id}`} className="text-blue-600 hover:underline mr-3">Manage</Link>
                  <Link href={`/admin/checkin/${e.id}`} className="text-green-600 hover:underline">Check-in</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
