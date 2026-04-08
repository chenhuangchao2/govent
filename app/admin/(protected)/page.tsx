import { db } from '@/lib/db'
import { Calendar, Clock, UserCheck, Users } from 'lucide-react'
import AnalyticsDashboard from '@/components/features/admin/AnalyticsDashboard'

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
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{activeEvents}</p>
          <p className="text-sm text-gray-500">Active Events</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className={`text-3xl font-bold ${pendingApprovals > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {pendingApprovals}
          </p>
          <p className="text-sm text-gray-500">Pending Approvals</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{todayCheckins}</p>
          <p className="text-sm text-gray-500">Today&apos;s Check-ins</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalRegistrations}</p>
          <p className="text-sm text-gray-500">Total Registrations</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <AnalyticsDashboard />
    </div>
  )
}
