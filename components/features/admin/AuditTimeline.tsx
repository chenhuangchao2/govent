interface Entry {
  id: string
  action: string
  actor?: { name: string } | null
  createdAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any
}

export default function AuditTimeline({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-0">
      {entries.map((e, i) => (
        <div key={e.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            {i < entries.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-gray-900">{e.action}</p>
            <p className="text-xs text-gray-400">
              {e.actor?.name ?? 'System'} · {new Date(e.createdAt).toLocaleString('en-SG')}
            </p>
            {e.metadata && (
              <pre className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1 overflow-auto max-w-sm">
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
