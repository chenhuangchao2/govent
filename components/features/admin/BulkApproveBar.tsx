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

interface BulkApproveBarProps {
  selectedIds: string[]
  onComplete: () => void
  onClear: () => void
}

export default function BulkApproveBar({ selectedIds, onComplete, onClear }: BulkApproveBarProps) {
  const [loading, setLoading] = useState(false)

  if (selectedIds.length === 0) return null

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch('/api/registrations/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationIds: selectedIds }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
      } else {
        const { approved, skipped, pendingPayment } = json.data
        const parts = [`Approved: ${approved - (pendingPayment || 0)}`]
        if (pendingPayment) parts.push(`Awaiting payment: ${pendingPayment}`)
        if (skipped) parts.push(`Skipped: ${skipped}`)
        toast.success(parts.join(' · '))
        onComplete()
      }
    } catch {
      toast.error('Failed to bulk approve')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-6 py-3 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {selectedIds.length} registration{selectedIds.length > 1 ? 's' : ''} selected
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            disabled={loading}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Clear
          </button>
          <AlertDialog>
            <AlertDialogTrigger
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Approve All'}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve {selectedIds.length} registrations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will send approval emails to all selected participants. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
