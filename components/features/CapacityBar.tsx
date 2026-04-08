interface CapacityBarProps {
  registered: number
  capacity: number
  showLabel?: boolean
}

export default function CapacityBar({
  registered,
  capacity,
  showLabel = true,
}: CapacityBarProps) {
  const isFull = registered >= capacity
  const pct = isFull ? 100 : Math.round((registered / capacity) * 100)

  const fillColour =
    pct > 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'

  const fillWidth = registered > 0 ? `${pct}%` : '0%'
  const minWidth = registered > 0 ? 'min-w-[8px]' : ''

  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${fillColour} ${minWidth}`}
          style={{ width: fillWidth }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-gray-500">
          {isFull
            ? 'Full — Waitlist open'
            : `${registered} / ${capacity} seats`}
        </p>
      )}
    </div>
  )
}
