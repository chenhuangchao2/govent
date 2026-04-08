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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface SelfCancelButtonProps {
  registrationId: string
  email: string
  status: string
  onCancel: () => void
}

export default function SelfCancelButton({ registrationId, email, status, onCancel }: SelfCancelButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const cancellable = ['PENDING', 'APPROVED', 'WAITLISTED', 'PENDING_PAYMENT']
  if (!cancellable.includes(status)) return null

  async function handleCancel() {
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
      setOpen(false)
      onCancel()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger className="text-sm text-red-600 hover:text-red-800 underline mt-2 text-left">
        Cancel Registration
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel registration?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. You will need to re-register if you change your mind.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep Registration</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Cancelling...' : 'Yes, Cancel Registration'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
