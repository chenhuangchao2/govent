'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  participantName: string
  loading: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export default function RejectModal({ open, participantName, loading, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('')

  function handleConfirm() {
    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  function handleClose() {
    if (loading) return
    setReason('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {participantName}?</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Not eligible — wrong organisation"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>
        <DialogFooter>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
