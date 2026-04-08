export default function AdminEventsLoading() {
  return (
    <div>
      {/* Header row: title + New Event button */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
        <div className="h-9 bg-gray-200 rounded-lg w-28 animate-pulse" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
        {/* Table header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
          {[140, 80, 100, 72, 96].map((w, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: `${w}px` }} />
          ))}
        </div>

        {/* 5 skeleton rows */}
        {[0, 1, 2, 3, 4].map((row) => (
          <div
            key={row}
            className="flex gap-4 items-center px-4 py-3 border-b border-gray-100 last:border-b-0"
          >
            {/* Title */}
            <div className="h-4 bg-gray-200 rounded w-48" />
            {/* Date */}
            <div className="h-4 bg-gray-200 rounded w-20" />
            {/* Registrations */}
            <div className="h-4 bg-gray-200 rounded w-10" />
            {/* Status badge */}
            <div className="h-5 bg-gray-200 rounded-full w-16" />
            {/* Actions */}
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
