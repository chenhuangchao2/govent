export default function EventDetailLoading() {
  return (
    <div className="max-w-2xl animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 bg-gray-200 rounded w-24 mb-4" />

      {/* Title skeleton */}
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />

      {/* Info grid — 6 rows */}
      <div className="space-y-2 mb-6">
        {[72, 48, 56, 32, 40, 36].map((w, i) => (
          <div key={i} className={`h-4 bg-gray-200 rounded`} style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      {/* Description block — 3 lines */}
      <div className="space-y-2 mb-6">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>

      {/* Register button skeleton */}
      <div className="h-10 bg-gray-200 rounded-lg w-36" />
    </div>
  )
}
