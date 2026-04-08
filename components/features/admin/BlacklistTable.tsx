'use client'

import { useState } from 'react'

interface Entry { id: string; email: string; reason: string; source: string; noShowCount: number; addedAt: string; isActive: boolean }

export default function BlacklistTable({ initial }: { initial: Entry[] }) {
  const [entries, setEntries] = useState(initial)
  const [newEmail, setNewEmail] = useState('')
  const [newReason, setNewReason] = useState('')

  async function add() {
    if (!newEmail || !newReason) return
    const res = await fetch('/api/blacklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail, reason: newReason }) })
    const data = await res.json()
    if (res.ok) { setEntries(e => [data.data, ...e]); setNewEmail(''); setNewReason('') }
  }

  async function remove(id: string) {
    await fetch(`/api/blacklist/${id}`, { method: 'DELETE' })
    setEntries(e => e.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3">
        <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email address" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={add} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Add</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Email', 'Reason', 'Source', 'No-shows', 'Added', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.filter(e => e.isActive).map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.email}</td>
                <td className="px-4 py-3 text-gray-600">{e.reason}</td>
                <td className="px-4 py-3 text-gray-500">{e.source}</td>
                <td className="px-4 py-3 text-gray-500">{e.noShowCount}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.addedAt).toLocaleDateString('en-SG')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(e.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.filter(e => e.isActive).length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No blacklist entries</p>
        )}
      </div>
    </div>
  )
}
