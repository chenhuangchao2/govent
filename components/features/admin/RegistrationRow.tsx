'use client'

import { useState } from 'react'
import StatusBadge from '@/components/features/StatusBadge'

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
  const [reason, setReason] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  async function act(action: string, extra?: Record<string, string>) {
    setLoading(true)
    await fetch(`/api/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    setLoading(false)
    if (action === 'resend-email') { setEmailSent(true); setTimeout(() => setEmailSent(false), 3000) }
    else onUpdate()
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 text-sm">{name}</p>
        <p className="text-xs text-gray-500">{email}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{department}</td>
      <td className="px-4 py-3"><StatusBadge status={status} /></td>
      <td className="px-4 py-3 text-xs text-gray-400">{new Date(createdAt).toLocaleDateString('en-SG')}</td>
      <td className="px-4 py-3">
        {status === 'PENDING' && !showReject && (
          <div className="flex gap-2">
            <button onClick={() => act('approve')} disabled={loading}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50">
              Approve
            </button>
            <button onClick={() => setShowReject(true)}
              className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">
              Reject
            </button>
          </div>
        )}
        {showReject && (
          <div className="flex gap-2 items-center">
            <input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 w-40" />
            <button onClick={() => act('reject', { reason })} disabled={!reason || loading}
              className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50">Confirm</button>
            <button onClick={() => setShowReject(false)} className="text-xs text-gray-500">Cancel</button>
          </div>
        )}
        {status === 'APPROVED' && (
          <button onClick={() => act('resend-email')} disabled={loading}
            className="text-xs text-blue-600 hover:underline">
            {emailSent ? '✓ Sent' : 'Resend email'}
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
  )
}
