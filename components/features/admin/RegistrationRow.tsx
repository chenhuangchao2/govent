'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import StatusBadge from '@/components/features/StatusBadge'
import RejectModal from '@/components/features/admin/RejectModal'

interface Props {
  id: string
  name: string
  email: string
  department: string
  status: string
  createdAt: string
  onUpdate: () => void
}

export default function RegistrationRow({ id, name, email, department, status, createdAt, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)

  async function act(action: string, extra?: Record<string, string>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Action failed')
      } else {
        const messages: Record<string, string> = {
          approve: `${name} approved`,
          reject: `${name} rejected`,
          'mark-paid': 'Marked as paid',
          'resend-email': `Email resent to ${email}`,
        }
        toast.success(messages[action] ?? 'Done')
        setShowReject(false)
        onUpdate()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900 text-sm">{name}</p>
          <p className="text-xs text-gray-500">{email}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{department}</td>
        <td className="px-4 py-3"><StatusBadge status={status} /></td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {new Date(createdAt).toLocaleDateString('en-SG')}
        </td>
        <td className="px-4 py-3">
          {status === 'PENDING' && (
            <div className="flex gap-2">
              <button onClick={() => act('approve')} disabled={loading}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                Approve
              </button>
              <button onClick={() => setShowReject(true)} disabled={loading}
                className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 disabled:opacity-50">
                Reject
              </button>
            </div>
          )}
          {status === 'APPROVED' && (
            <button onClick={() => act('resend-email')} disabled={loading}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50">
              Resend email
            </button>
          )}
          {status === 'PENDING_PAYMENT' && (
            <button onClick={() => act('mark-paid')} disabled={loading}
              className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50">
              Mark paid
            </button>
          )}
        </td>
      </tr>
      <RejectModal
        open={showReject}
        participantName={name}
        loading={loading}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => act('reject', { reason })}
      />
    </>
  )
}
