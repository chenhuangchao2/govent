import { db } from '@/lib/db'
import AnalyticsSection from './analytics-section'

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [activeEvents, pendingApprovals, todayCheckins, totalRegistrations] =
    await Promise.all([
      db.event.count({
        where: { isPublished: true, isCancelled: false },
      }),
      db.registration.count({
        where: { status: 'PENDING' },
      }),
      db.registration.count({
        where: {
          status: 'ATTENDED',
          checkedInAt: { gte: today },
        },
      }),
      db.registration.count(),
    ])

  const stats = [
    {
      label: 'Active Events',
      value: activeEvents,
      iconBg: 'bg-primary-fixed/30',
      iconColor: 'text-primary',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
        </svg>
      ),
      badge: 'Live',
      badgeClass: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      badge: pendingApprovals > 0 ? 'Alert' : 'Clear',
      badgeClass: pendingApprovals > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50',
    },
    {
      label: "Today's Check-ins",
      value: todayCheckins,
      iconBg: 'bg-tertiary-fixed/30',
      iconColor: 'text-tertiary',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      ),
      badge: 'Today',
      badgeClass: 'text-tertiary bg-tertiary-fixed/20',
    },
    {
      label: 'Total Registrations',
      value: totalRegistrations,
      iconBg: 'bg-secondary-fixed/30',
      iconColor: 'text-secondary',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      badge: 'All Time',
      badgeClass: 'text-secondary bg-secondary-fixed/20',
    },
  ]

  return (
    <div className="space-y-12">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">
          Executive Dashboard
        </h2>
        <p className="text-on-surface-variant font-medium text-sm">
          Welcome back, here&apos;s what&apos;s happening today.
        </p>
      </header>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-lg border border-outline-variant/10 flex flex-col gap-5 group hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 ${stat.iconBg} rounded-lg ${stat.iconColor}`}>
                {stat.icon}
              </div>
              <span
                className={`text-xs font-bold ${stat.badgeClass} px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap`}
              >
                {stat.badge}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight">
                {stat.value.toLocaleString()}
              </h3>
            </div>
          </div>
        ))}
      </section>

      {/* Analytics Section (Client Component) */}
      <AnalyticsSection />
    </div>
  )
}
