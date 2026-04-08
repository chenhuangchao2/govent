export default function AuditLogLoading() {
  return (
    <div>
      {/* Title + entry count row */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
      </div>

      {/* Filter row — 3 dropdowns */}
      <div className="flex gap-3 mb-4 animate-pulse">
        <div className="h-9 bg-gray-200 rounded-lg w-36" />
        <div className="h-9 bg-gray-200 rounded-lg w-40" />
        <div className="h-9 bg-gray-200 rounded-lg w-32" />
      </div>

      {/* Card rows */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg border border-gray-100"
          >
            {/* Action badge */}
            <div className="h-5 bg-gray-200 rounded-full w-24 flex-shrink-0 mt-0.5" />
            {/* Middle: actor + event */}
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-48" />
              <div className="h-3 bg-gray-200 rounded w-64" />
            </div>
            {/* Timestamp */}
            <div className="h-3 bg-gray-200 rounded w-20 flex-shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  )
}
