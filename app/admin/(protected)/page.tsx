import { db } from '@/lib/db'

export default async function AdminDashboard() {
  const [totalEvents, pendingRegs, todayCheckins] = await Promise.all([
    db.event.count({ where: { isPublished: true, isCancelled: false } }),
    db.registration.count({ where: { status: 'PENDING' } }),
    db.registration.count({ where: { status: 'ATTENDED', checkedInAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
  ])

  const stats = [
    { label: 'Active Events', value: totalEvents },
    { label: 'Pending Approval', value: pendingRegs, highlight: pendingRegs > 0 },
    { label: "Today's Check-ins", value: todayCheckins },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.highlight ? 'border-amber-300' : 'border-gray-200'}`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.highlight ? 'text-amber-600' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
