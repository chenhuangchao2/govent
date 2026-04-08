'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface EventData {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  venue: string
  capacity: number
  registrationDeadline: string
  allowedDomains: string[]
  allowedDepartments: string[]
  cpdHours: number
  isPaid: boolean
  price: number | null
  isCancelled: boolean
}

export default function EventEditForm({ event }: { event: EventData }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isPaid, setIsPaid] = useState(event.isPaid)

  function toDatetimeLocal(iso: string) {
    return new Date(iso).toISOString().slice(0, 16)
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
      capacity: fd.get('capacity'),
      registrationDeadline: fd.get('registrationDeadline'),
      allowedDomains: (fd.get('allowedDomains') as string).split(',').map(s => s.trim()).filter(Boolean),
      allowedDepartments: (fd.get('allowedDepartments') as string).split(',').map(s => s.trim()).filter(Boolean),
      cpdHours: fd.get('cpdHours'),
      isPaid,
      price: isPaid ? fd.get('price') : null,
    }
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      toast.error(data.error ?? 'Failed to save changes')
    } else {
      toast.success('Event updated')
      router.refresh()
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <details className="mt-6 border border-gray-200 rounded-xl bg-gray-50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 select-none hover:bg-gray-100 rounded-xl">
        ✏️ Edit Event Details
      </summary>
      <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-2xl">
        <div>
          <label className={labelClass}>Title</label>
          <input name="title" defaultValue={event.title} className={inputClass} required disabled={event.isCancelled} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" defaultValue={event.description} className={inputClass} rows={3} required disabled={event.isCancelled} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Time</label>
            <input type="datetime-local" name="startTime" defaultValue={toDatetimeLocal(event.startTime)} className={inputClass} required disabled={event.isCancelled} />
          </div>
          <div>
            <label className={labelClass}>End Time</label>
            <input type="datetime-local" name="endTime" defaultValue={toDatetimeLocal(event.endTime)} className={inputClass} required disabled={event.isCancelled} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Venue</label>
          <input name="venue" defaultValue={event.venue} className={inputClass} required disabled={event.isCancelled} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Capacity</label>
            <input type="number" name="capacity" defaultValue={event.capacity} className={inputClass} required disabled={event.isCancelled} />
          </div>
          <div>
            <label className={labelClass}>Registration Deadline</label>
            <input type="datetime-local" name="registrationDeadline" defaultValue={toDatetimeLocal(event.registrationDeadline)} className={inputClass} required disabled={event.isCancelled} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Allowed Email Domains (comma-separated, empty = all)</label>
          <input name="allowedDomains" defaultValue={event.allowedDomains.join(', ')} placeholder="govtech.gov.sg, tech.gov.sg" className={inputClass} disabled={event.isCancelled} />
        </div>
        <div>
          <label className={labelClass}>Allowed Departments (comma-separated, empty = all)</label>
          <input name="allowedDepartments" defaultValue={event.allowedDepartments.join(', ')} placeholder="Engineering, Policy" className={inputClass} disabled={event.isCancelled} />
        </div>
        <div>
          <label className={labelClass}>CPD Hours</label>
          <input type="number" name="cpdHours" defaultValue={event.cpdHours} step="0.5" className={inputClass} disabled={event.isCancelled} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isPaidEdit" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} disabled={event.isCancelled} />
          <label htmlFor="isPaidEdit" className="text-sm text-gray-700">Paid event</label>
        </div>
        {isPaid && (
          <div>
            <label className={labelClass}>Price (SGD)</label>
            <input type="number" name="price" defaultValue={event.price ?? undefined} step="0.01" className={inputClass} disabled={event.isCancelled} />
          </div>
        )}
        {!event.isCancelled && (
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </form>
    </details>
  )
}
