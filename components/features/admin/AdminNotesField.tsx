'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'

export default function AdminNotesField({ registrationId, initialNotes }: { registrationId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const lastSaved = useRef(initialNotes ?? '')

  async function save() {
    if (notes === lastSaved.current) return
    setSaving(true)
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-note', notes }),
      })
      if (!res.ok) throw new Error('Failed to save')
      lastSaved.current = notes
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={save}
        placeholder="Add internal notes..."
        rows={2}
        className="w-full text-xs bg-gray-50 rounded px-2 py-1.5 border border-transparent focus:border-gray-300 focus:bg-white focus:outline-none resize-none"
      />
      {saving && <span className="absolute top-1 right-2 text-xs text-gray-400">Saving...</span>}
    </div>
  )
}
