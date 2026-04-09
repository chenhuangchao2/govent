interface CapacityBarProps {
  registered: number
  capacity: number
  /** admin mode shows exact numbers + progress bar; public mode shows status only */
  admin?: boolean
}

export default function CapacityBar({
  registered,
  capacity,
  admin = false,
}: CapacityBarProps) {
  const isFull = registered >= capacity

  if (admin) {
    const pct = capacity === 0 ? 0 : isFull ? 100 : Math.round((registered / capacity) * 100)
    const fillColour =
      pct > 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'

    return (
      <div className="w-full">
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fillColour} ${registered > 0 ? 'min-w-[8px]' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {isFull ? 'Full — Waitlist open' : `${registered} / ${capacity} seats`}
        </p>
      </div>
    )
  }

  // Public mode — status text only
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isFull ? 'text-amber-600' : 'text-green-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isFull ? 'bg-amber-500' : 'bg-green-500'}`} />
      {isFull ? 'Waitlist Open' : 'Seats Available'}
    </span>
  )
}
