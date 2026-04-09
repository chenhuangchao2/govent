'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [venueHidden, setVenueHidden] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [deadline, setDeadline] = useState('')

  const SUGGESTED_TAGS = ['AI', 'Cloud', 'Cybersecurity', 'Data', 'Design', 'Agile', 'Leadership', 'Compliance']

  // Date validation warnings
  const dateWarnings: string[] = []
  if (startTime && endTime && endTime <= startTime) {
    dateWarnings.push('End time must be after start time')
  }
  if (startTime && deadline && deadline >= startTime) {
    dateWarnings.push('Registration deadline must be before start time')
  }

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
      imageUrl: fd.get('imageUrl') || null,
      tags: selectedTags,
      allowedDomains: (fd.get('allowedDomains') as string).split(',').map(s => s.trim()).filter(Boolean),
      allowedOrganisations: (fd.get('allowedOrganisations') as string).split(',').map(s => s.trim()).filter(Boolean),
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
        <div><label className={labelClass}>Start Time</label><input type="datetime-local" name="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} required /></div>
        <div><label className={labelClass}>End Time</label><input type="datetime-local" name="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} className={`${inputClass} ${startTime && endTime && endTime <= startTime ? 'border-red-400 ring-1 ring-red-400' : ''}`} required /></div>
      </div>
      {dateWarnings.length > 0 && (
        <div className="space-y-1">
          {dateWarnings.map((w, i) => <p key={i} className="text-xs text-red-600">{w}</p>)}
        </div>
      )}
      <div><label className={labelClass}>Venue</label><input name="venue" className={inputClass} required /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="venueHidden" checked={venueHidden} onChange={e => setVenueHidden(e.target.checked)} />
        <label htmlFor="venueHidden" className="text-sm text-gray-700">Hide venue from public (revealed only to approved registrants)</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelClass}>Capacity</label><input type="number" name="capacity" min="1" className={inputClass} required /></div>
        <div><label className={labelClass}>Registration Deadline</label><input type="datetime-local" name="registrationDeadline" value={deadline} onChange={e => setDeadline(e.target.value)} className={`${inputClass} ${startTime && deadline && deadline >= startTime ? 'border-red-400 ring-1 ring-red-400' : ''}`} required /></div>
      </div>
      <div>
        <label className={labelClass}>Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED_TAGS.map(tag => (
            <button key={tag} type="button"
              onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >{tag}</button>
          ))}
        </div>
        {selectedTags.length > 0 && <p className="text-xs text-gray-400">Selected: {selectedTags.join(', ')}</p>}
      </div>
      <div><label className={labelClass}>Cover Image URL (optional)</label><input name="imageUrl" placeholder="https://images.unsplash.com/..." className={inputClass} /></div>
      <div><label className={labelClass}>Allowed Email Domains (comma-separated, empty = all)</label><input name="allowedDomains" placeholder="govtech.gov.sg, tech.gov.sg" className={inputClass} /></div>
      <div><label className={labelClass}>Allowed Organisations (comma-separated, empty = all)</label><input name="allowedOrganisations" placeholder="GovTech, IMDA" className={inputClass} /></div>
      <div><label className={labelClass}>CPD Hours</label><input type="number" name="cpdHours" defaultValue="0" step="0.5" className={inputClass} /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isPaid" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
        <label htmlFor="isPaid" className="text-sm text-gray-700">Paid event</label>
      </div>
      {isPaid && <div><label className={labelClass}>Price (SGD)</label><input type="number" name="price" step="0.01" min="0.01" required className={inputClass} /></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading || dateWarnings.length > 0} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  )
}
