'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface EventData {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  venue: string
  capacity: number
  registrationDeadline: string
  allowedDomains: string[]
  allowedOrganisations: string[]
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
  hint?: string
}

const FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'venue', label: 'Venue', type: 'text' },
  { key: 'startTime', label: 'Start Time', type: 'datetime' },
  { key: 'endTime', label: 'End Time', type: 'datetime' },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'registrationDeadline', label: 'Registration Deadline', type: 'datetime' },
  { key: 'allowedDomains', label: 'Allowed Domains', type: 'tags', hint: 'e.g. tech.gov.sg — leave empty for open access' },
  { key: 'allowedOrganisations', label: 'Allowed Organisations', type: 'tags', hint: 'e.g. GovTech, IMDA — leave empty for all' },
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
  const [tagInput, setTagInput] = useState('')

  function startEdit(key: string) {
    if (event.isCancelled) return
    const field = FIELDS.find(f => f.key === key)!
    let val = event[key as keyof EventData]
    if (field.type === 'datetime') val = toDatetimeLocal(val as string)
    if (field.type === 'tags') val = [...(val as string[])]
    setDraft({ [key]: val })
    setTagInput('')
    setEditing(key)
  }

  async function saveField(key: string, valueOverride?: unknown) {
    setSaving(true)
    const field = FIELDS.find(f => f.key === key)!
    const value = valueOverride !== undefined ? valueOverride : draft[key]

    const body: Record<string, unknown> = { [key]: value }
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
    setTagInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent, key: string) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveField(key)
    }
    if (e.key === 'Escape') cancel()
  }

  // Tags helpers
  function addTag(key: string) {
    const val = tagInput.trim()
    if (!val) return
    const current = (draft[key] as string[]) || []
    if (!current.includes(val)) {
      setDraft({ [key]: [...current, val] })
    }
    setTagInput('')
  }

  function removeTag(key: string, tag: string) {
    const current = (draft[key] as string[]) || []
    setDraft({ [key]: current.filter(t => t !== tag) })
  }

  function handleTagKeyDown(e: React.KeyboardEvent, key: string) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(key)
    }
    if (e.key === 'Backspace' && tagInput === '') {
      const current = (draft[key] as string[]) || []
      if (current.length > 0) {
        setDraft({ [key]: current.slice(0, -1) })
      }
    }
    if (e.key === 'Escape') cancel()
  }

  const inputClass = "w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

  function renderTagsDisplay(tags: string[]) {
    if (tags.length === 0) {
      return <span className="text-sm text-gray-400 italic">Open to all (no restriction)</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {tag}
          </span>
        ))}
      </div>
    )
  }

  function renderTagsEditor(key: string, hint?: string) {
    const current = (draft[key] as string[]) || []
    return (
      <div onClick={e => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {current.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {tag}
              <button onClick={() => removeTag(key, tag)} className="hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => handleTagKeyDown(e, key)}
            placeholder="Type and press Enter to add"
            className={inputClass}
          />
          <button onClick={() => addTag(key)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shrink-0">
            Add
          </button>
        </div>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        <div className="flex gap-2 mt-2">
          <button onClick={() => saveField(key)} disabled={saving}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={cancel}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    )
  }

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
            field.type === 'tags' ? (
              renderTagsEditor(field.key, field.hint)
            ) : (
              <div className="flex gap-2 items-start" onClick={e => e.stopPropagation()}>
                <div className="flex-1">
                  {field.type === 'textarea' ? (
                    <textarea
                      autoFocus
                      value={draft[field.key] as string}
                      onChange={e => setDraft({ [field.key]: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Escape') cancel() }}
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
                        onChange={e => {
                          setDraft({ [field.key]: e.target.checked })
                          saveField(field.key, e.target.checked)
                        }}
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
                    />
                  )}
                </div>
                {field.type !== 'checkbox' && (
                  <>
                    <button onClick={() => saveField(field.key)} disabled={saving}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0">
                      {saving ? '...' : 'Save'}
                    </button>
                    <button onClick={cancel}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shrink-0">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )
          ) : (
            <div className="flex items-center justify-between">
              {field.type === 'tags' ? (
                renderTagsDisplay(value as string[])
              ) : (
                <span className={`text-sm ${value == null || value === '' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {field.type === 'textarea'
                    ? <span className="whitespace-pre-line">{formatDisplay(field, value)}</span>
                    : formatDisplay(field, value)
                  }
                </span>
              )}
              {!event.isCancelled && (
                <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
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
