'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [venueHidden, setVenueHidden] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      title: fd.get('title'),
      description: fd.get('description'),
      startTime: fd.get('startTime'),
      endTime: fd.get('endTime'),
      venue: fd.get('venue'),
      venueHidden,
      capacity: fd.get('capacity'),
      registrationDeadline: fd.get('registrationDeadline'),
      allowedDomains: (fd.get('allowedDomains') as string).split(',').map(s => s.trim()).filter(Boolean),
      allowedDepartments: (fd.get('allowedDepartments') as string).split(',').map(s => s.trim()).filter(Boolean),
      isPaid,
      price: isPaid ? fd.get('price') : null,
      cpdHours: fd.get('cpdHours'),
    }
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    // Publish immediately then navigate
    await fetch(`/api/events/${data.data.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    })
    router.push(`/admin/events/${data.data.id}`)
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div><label className={labelClass}>Title</label><input name="title" className={inputClass} required /></div>
      <div><label className={labelClass}>Description</label><textarea name="description" className={inputClass} rows={3} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelClass}>Start Time</label><input type="datetime-local" name="startTime" className={inputClass} required /></div>
        <div><label className={labelClass}>End Time</label><input type="datetime-local" name="endTime" className={inputClass} required /></div>
      </div>
      <div><label className={labelClass}>Venue</label><input name="venue" className={inputClass} required /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="venueHidden" checked={venueHidden} onChange={e => setVenueHidden(e.target.checked)} />
        <label htmlFor="venueHidden" className="text-sm text-gray-700">Hide venue from public (revealed only to approved registrants)</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelClass}>Capacity</label><input type="number" name="capacity" className={inputClass} required /></div>
        <div><label className={labelClass}>Registration Deadline</label><input type="datetime-local" name="registrationDeadline" className={inputClass} required /></div>
      </div>
      <div><label className={labelClass}>Allowed Email Domains (comma-separated, empty = all)</label><input name="allowedDomains" placeholder="govtech.gov.sg, tech.gov.sg" className={inputClass} /></div>
      <div><label className={labelClass}>Allowed Departments (comma-separated, empty = all)</label><input name="allowedDepartments" placeholder="Engineering, Policy" className={inputClass} /></div>
      <div><label className={labelClass}>CPD Hours</label><input type="number" name="cpdHours" defaultValue="0" step="0.5" className={inputClass} /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isPaid" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
        <label htmlFor="isPaid" className="text-sm text-gray-700">Paid event</label>
      </div>
      {isPaid && <div><label className={labelClass}>Price (SGD)</label><input type="number" name="price" step="0.01" className={inputClass} /></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  )
}
