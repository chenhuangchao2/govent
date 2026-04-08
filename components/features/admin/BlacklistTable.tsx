'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Entry {
  id: string
  email: string
  reason: string
  source: string
  noShowCount: number
  addedAt: string
  isActive: boolean
}

export default function BlacklistTable({ initial }: { initial: Entry[] }) {
  const [entries, setEntries] = useState(initial)
  const [newEmail, setNewEmail] = useState('')
  const [newReason, setNewReason] = useState('')
  const [showAddConfirm, setShowAddConfirm] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  async function add() {
    if (!newEmail || !newReason) return
    const res = await fetch('/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, reason: newReason }),
    })
    const text = await res.text()
    setShowAddConfirm(false)
    if (res.ok) {
      const data = JSON.parse(text)
      setEntries(e => [data.data, ...e])
      setNewEmail('')
      setNewReason('')
      toast.success(`${newEmail} added to blacklist`)
    } else {
      let errorMsg = 'Failed to add'
      try { errorMsg = JSON.parse(text).error ?? errorMsg } catch {}
      toast.error(errorMsg)
    }
  }

  async function remove(id: string) {
    const entry = entries.find(e => e.id === id)
    await fetch(`/api/blacklist/${id}`, { method: 'DELETE' })
    setEntries(e => e.filter(x => x.id !== id))
    setPendingRemoveId(null)
    toast.success(`${entry?.email ?? 'Entry'} removed from blacklist`)
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3">
        <input
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="Email address"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={newReason}
          onChange={e => setNewReason(e.target.value)}
          placeholder="Reason"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => { if (newEmail && newReason) setShowAddConfirm(true) }}
          disabled={!newEmail || !newReason}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
          Add
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Email', 'Reason', 'Source', 'No-shows', 'Added', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.filter(e => e.isActive).map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.email}</td>
                <td className="px-4 py-3 text-gray-600">{e.reason}</td>
                <td className="px-4 py-3 text-gray-500">{e.source}</td>
                <td className="px-4 py-3 text-gray-500">{e.noShowCount}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(e.addedAt).toLocaleDateString('en-SG')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPendingRemoveId(e.id)}
                    className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.filter(e => e.isActive).length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No blacklist entries</p>
        )}
      </div>

      {/* Add confirmation */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add {newEmail} to blacklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Reason: {newReason}. They will not be able to register for any future events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={add} className="bg-red-600 text-white hover:bg-red-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!pendingRemoveId} onOpenChange={(o) => !o && setPendingRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from blacklist?</AlertDialogTitle>
            <AlertDialogDescription>
              {entries.find(e => e.id === pendingRemoveId)?.email} will be able to register again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingRemoveId && remove(pendingRemoveId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
