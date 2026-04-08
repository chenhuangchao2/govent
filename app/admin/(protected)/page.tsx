import { db } from '@/lib/db'
import Link from 'next/link'
import { Calendar, Clock, UserCheck, Users } from 'lucide-react'

export default async function AdminDashboard() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [activeEvents, pendingApprovals, todayCheckins, totalRegistrations] = await Promise.all([
    db.event.count({ where: { isPublished: true, isCancelled: false } }),
    db.registration.count({ where: { status: 'PENDING' } }),
    db.registration.count({
      where: { status: 'ATTENDED', checkedInAt: { gte: todayStart } },
    }),
    db.registration.count(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Active Events */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{activeEvents}</p>
          <p className="text-sm text-gray-500">Active Events</p>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className={`text-3xl font-bold ${pendingApprovals > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {pendingApprovals}
          </p>
          <p className="text-sm text-gray-500">Pending Approvals</p>
        </div>

        {/* Card 3: Today's Check-ins */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{todayCheckins}</p>
          <p className="text-sm text-gray-500">Today&apos;s Check-ins</p>
        </div>

        {/* Card 4: Total Registrations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalRegistrations}</p>
          <p className="text-sm text-gray-500">Total Registrations</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/events/new"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Create Event
        </Link>
        <Link
          href="/admin/audit-log"
          className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          View Audit Log
        </Link>
      </div>
    </div>
  )
}
