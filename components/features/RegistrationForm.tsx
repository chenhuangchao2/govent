'use client'

import { useState } from 'react'
import StatusBadge from './StatusBadge'

export default function RegistrationForm({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [form, setForm] = useState({ name: '', email: '', department: '', remarks: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, ...form }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }
    setResult(data.data)
  }

  if (result) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-semibold mb-2">Registration received!</h2>
        <div className="mb-2"><StatusBadge status={result.status} /></div>
        <p className="text-gray-500 text-sm">
          {result.status === 'WAITLISTED'
            ? 'You are on the waitlist. We will notify you if a spot opens.'
            : 'Your registration is pending approval. Check your email for confirmation.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
        <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
        <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit Registration'}
      </button>
    </form>
  )
}
