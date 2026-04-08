export default function EventsLoading() {
  return (
    <div>
      {/* Page title skeleton */}
      <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse"
          >
            {/* Title row + price badge */}
            <div className="flex justify-between items-start mb-2">
              <div className="h-5 bg-gray-200 rounded w-56" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>

            {/* Date */}
            <div className="h-4 bg-gray-200 rounded w-64 mb-1" />

            {/* Venue */}
            <div className="h-4 bg-gray-200 rounded w-48 mb-3" />

            {/* Capacity bar area + View link */}
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-40" />
              <div className="h-4 bg-gray-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
