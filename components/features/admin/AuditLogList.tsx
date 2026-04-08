import { formatRelativeTime } from '@/lib/utils'

interface Entry {
  id: string
  action: string
  actor?: { name: string } | null
  eventTitle?: string | null
  createdAt: string
  metadata?: Record<string, unknown> | null
}

const ACTION_COLORS: Record<string, string> = {
  'CREATE_EVENT': 'bg-green-100 text-green-700',
  'UPDATE_EVENT': 'bg-blue-100 text-blue-700',
  'PUBLISH_EVENT': 'bg-emerald-100 text-emerald-700',
  'UNPUBLISH_EVENT': 'bg-yellow-100 text-yellow-700',
  'CANCEL_EVENT': 'bg-red-100 text-red-700',
  'APPROVE_REGISTRATION': 'bg-green-100 text-green-700',
  'REJECT_REGISTRATION': 'bg-red-100 text-red-700',
  'CHECK_IN': 'bg-purple-100 text-purple-700',
  'ADD_BLACKLIST': 'bg-red-100 text-red-700',
  'REMOVE_BLACKLIST': 'bg-gray-100 text-gray-700',
  'MARK_NO_SHOW': 'bg-orange-100 text-orange-700',
}

function getActionBadgeClass(action: string) {
  return ACTION_COLORS[action] || 'bg-gray-100 text-gray-600'
}

function formatActionLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatMetadata(metadata: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'registrationId' || key === 'eventId') continue
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
    parts.push(`${label}: ${value}`)
  }
  return parts.join(' · ')
}

function groupByDate(entries: Entry[]): { date: string; items: Entry[] }[] {
  const groups: Map<string, Entry[]> = new Map()
  for (const entry of entries) {
    const d = new Date(entry.createdAt)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (d.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }))
}

export default function AuditLogList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">No audit entries found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  const groups = groupByDate(entries)

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.date}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white py-1">
            {group.date}
          </h3>
          <div className="space-y-2">
            {group.items.map(e => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionBadgeClass(e.action)}`}>
                      {formatActionLabel(e.action)}
                    </span>
                    {e.eventTitle && (
                      <span className="text-xs text-gray-500 truncate max-w-[200px]" title={e.eventTitle}>
                        {e.eventTitle}
                      </span>
                    )}
                  </div>
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {formatMetadata(e.metadata)}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400" title={new Date(e.createdAt).toLocaleString('en-SG')}>
                    {formatRelativeTime(e.createdAt)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {e.actor?.name ?? 'System'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
