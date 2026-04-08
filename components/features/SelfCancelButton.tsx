'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface SelfCancelButtonProps {
  registrationId: string
  email: string
  status: string
  onCancel: () => void
}

export default function SelfCancelButton({ registrationId, email, status, onCancel }: SelfCancelButtonProps) {
  const [loading, setLoading] = useState(false)

  const cancellable = ['PENDING', 'APPROVED', 'WAITLISTED', 'PENDING_PAYMENT']
  if (!cancellable.includes(status)) return null

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this registration? This cannot be undone.')) return

    setLoading(true)
    try {
      const res = await fetch('/api/registrations/self-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, email }),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Failed to cancel registration')
        return
      }

      toast.success('Registration cancelled')
      onCancel()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-800 underline mt-2 disabled:opacity-50"
    >
      {loading ? 'Cancelling...' : 'Cancel Registration'}
    </button>
  )
}
