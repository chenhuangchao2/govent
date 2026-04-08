'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface EventData {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  venue: string
  venueHidden: boolean
  capacity: number
  registrationDeadline: string
  allowedDomains: string[]
  allowedDepartments: string[]
  cpdHours: number
  isPaid: boolean
  price: number | null
  isCancelled: boolean
}

interface FieldConfig {
  key: keyof EventData
  label: string
  type: 'text' | 'textarea' | 'datetime' | 'number' | 'tags' | 'checkbox' | 'currency'
  step?: string
}

const FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'venue', label: 'Venue', type: 'text' },
  { key: 'venueHidden', label: 'Hide Venue Until Approved', type: 'checkbox' },
  { key: 'startTime', label: 'Start Time', type: 'datetime' },
  { key: 'endTime', label: 'End Time', type: 'datetime' },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'registrationDeadline', label: 'Registration Deadline', type: 'datetime' },
  { key: 'allowedDomains', label: 'Allowed Domains', type: 'tags' },
  { key: 'allowedDepartments', label: 'Allowed Departments', type: 'tags' },
  { key: 'cpdHours', label: 'CPD Hours', type: 'number', step: '0.5' },
  { key: 'isPaid', label: 'Paid Event', type: 'checkbox' },
  { key: 'price', label: 'Price (SGD)', type: 'currency' },
]

function formatDisplay(field: FieldConfig, value: unknown): string {
  if (value == null || value === '') return '—'
  switch (field.type) {
    case 'datetime':
      return new Date(value as string).toLocaleString('en-SG', {
        dateStyle: 'medium', timeStyle: 'short',
      })
    case 'tags':
      return (value as string[]).length > 0 ? (value as string[]).join(', ') : 'All (no restriction)'
    case 'checkbox':
      return value ? 'Yes' : 'No'
    case 'currency':
      return `SGD ${Number(value).toFixed(2)}`
    default:
      return String(value)
  }
}

function toDatetimeLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 16)
}

export default function EventOverview({ event }: { event: EventData }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  function startEdit(key: string) {
    if (event.isCancelled) return
    const field = FIELDS.find(f => f.key === key)!
    let val = event[key as keyof EventData]
    if (field.type === 'datetime') val = toDatetimeLocal(val as string)
    if (field.type === 'tags') val = (val as string[]).join(', ')
    setDraft({ [key]: val })
    setEditing(key)
  }

  async function save(key: string) {
    setSaving(true)
    const field = FIELDS.find(f => f.key === key)!
    let value = draft[key]

    if (field.type === 'tags') {
      value = (value as string).split(',').map(s => s.trim()).filter(Boolean)
    }

    const body: Record<string, unknown> = { [key]: value }
    // If turning off isPaid, also clear price
    if (key === 'isPaid' && !value) body.price = null

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      if (!res.ok) {
        let msg = 'Failed to save'
        try { msg = JSON.parse(text).error ?? msg } catch {}
        toast.error(msg)
      } else {
        toast.success(`${field.label} updated`)
        setEditing(null)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setEditing(null)
    setDraft({})
  }

  function handleKeyDown(e: React.KeyboardEvent, key: string) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save(key)
    }
    if (e.key === 'Escape') cancel()
  }

  const inputClass = "w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  function renderField(field: FieldConfig) {
    const isEditing = editing === field.key
    const value = event[field.key]

    // Hide price row if not paid
    if (field.key === 'price' && !event.isPaid) return null

    return (
      <div
        key={field.key}
        className={`grid grid-cols-3 gap-4 px-4 py-3 border-b border-gray-50 last:border-0 ${
          !event.isCancelled && !isEditing ? 'hover:bg-blue-50/50 cursor-pointer group' : ''
        }`}
        onClick={() => !isEditing && startEdit(field.key)}
      >
        <div className="text-sm font-medium text-gray-500">{field.label}</div>
        <div className="col-span-2">
          {isEditing ? (
            <div className="flex gap-2 items-start" onClick={e => e.stopPropagation()}>
              <div className="flex-1">
                {field.type === 'textarea' ? (
                  <textarea
                    autoFocus
                    value={draft[field.key] as string}
                    onChange={e => setDraft({ [field.key]: e.target.value })}
                    onKeyDown={e => handleKeyDown(e, field.key)}
                    className={inputClass}
                    rows={3}
                  />
                ) : field.type === 'datetime' ? (
                  <input
                    type="datetime-local"
                    autoFocus
                    value={draft[field.key] as string}
                    onChange={e => setDraft({ [field.key]: e.target.value })}
                    onKeyDown={e => handleKeyDown(e, field.key)}
                    className={inputClass}
                  />
                ) : field.type === 'number' || field.type === 'currency' ? (
                  <input
                    type="number"
                    autoFocus
                    value={draft[field.key] as string}
                    onChange={e => setDraft({ [field.key]: e.target.value })}
                    onKeyDown={e => handleKeyDown(e, field.key)}
                    step={field.step ?? (field.type === 'currency' ? '0.01' : '1')}
                    className={inputClass}
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft[field.key] as boolean}
                      onChange={e => setDraft({ [field.key]: e.target.checked })}
                    />
                    {draft[field.key] ? 'Yes' : 'No'}
                  </label>
                ) : (
                  <input
                    type="text"
                    autoFocus
                    value={draft[field.key] as string}
                    onChange={e => setDraft({ [field.key]: e.target.value })}
                    onKeyDown={e => handleKeyDown(e, field.key)}
                    className={inputClass}
                    placeholder={field.type === 'tags' ? 'comma-separated values' : ''}
                  />
                )}
              </div>
              <button onClick={() => save(field.key)} disabled={saving}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
                {saving ? '...' : 'Save'}
              </button>
              <button onClick={cancel}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shrink-0">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${value == null || (Array.isArray(value) && value.length === 0) ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {field.type === 'textarea'
                  ? <span className="whitespace-pre-line">{formatDisplay(field, value)}</span>
                  : formatDisplay(field, value)
                }
              </span>
              {!event.isCancelled && (
                <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {FIELDS.map(renderField)}
    </div>
  )
}
