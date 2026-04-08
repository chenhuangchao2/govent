'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Camera, Search, Hash } from 'lucide-react'
import CheckInSearch from './CheckInSearch'
import CheckInStatsPanel from './CheckInStatsPanel'

interface Props {
  eventId: string
}

type ScanResult = { success: true; name: string; time: string } | { success: false; error: string }

export default function CheckinScanner({ eventId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [attendedCount, setAttendedCount] = useState(0)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const lastScanned = useRef<string | null>(null)
  const [manualId, setManualId] = useState('')
  const [tab, setTab] = useState<'qr' | 'search' | 'manual'>('search')
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    loadCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab !== 'qr') return

    const reader = new BrowserQRCodeReader()
    readerRef.current = reader

    async function startCamera() {
      if (!videoRef.current) return
      try {
        await reader.decodeFromVideoDevice(undefined, videoRef.current!, async (res) => {
          if (!res) return
          const id = res.getText()
          if (id === lastScanned.current) return
          lastScanned.current = id
          await processCheckin(id)
          setTimeout(() => {
            lastScanned.current = null
          }, 3000)
        })
        setCameraError(false)
      } catch {
        setCameraError(true)
      }
    }

    startCamera()

    return () => {
      BrowserQRCodeReader.releaseAllStreams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function loadCount() {
    const res = await fetch(`/api/registrations?eventId=${eventId}&status=ATTENDED`)
    const data = await res.json()
    setAttendedCount(data.data?.length ?? 0)
  }

  async function processCheckin(registrationId: string) {
    const res = await fetch(`/api/registrations/${registrationId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    const data = await res.json()
    if (res.ok) {
      setResult({
        success: true,
        name: data.data.name,
        time: new Date(data.data.checkedInAt).toLocaleTimeString('en-SG'),
      })
      setAttendedCount((c) => c + 1)
    } else {
      setResult({ success: false, error: data.error })
    }
    setTimeout(() => setResult(null), 3000)
  }

  function handleManualSubmit() {
    if (manualId.trim()) {
      processCheckin(manualId.trim())
      setManualId('')
    }
  }

  const tabs = [
    { key: 'qr' as const, label: 'QR Scanner', icon: Camera },
    { key: 'search' as const, label: 'Search', icon: Search },
    { key: 'manual' as const, label: 'Manual ID', icon: Hash },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Main check-in area */}
      <div className="flex-1 min-w-0">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-2xl font-bold text-gray-900">{attendedCount} checked in</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'qr' && (
          <div className="relative rounded-xl overflow-hidden bg-black" style={{ maxWidth: 400 }}>
            {cameraError ? (
              <div className="flex items-center justify-center h-64 bg-gray-100 text-center p-6">
                <div>
                  <Camera className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Camera not available</p>
                  <p className="text-xs text-gray-500 mt-1">Use Search or Manual ID tab</p>
                </div>
              </div>
            ) : (
              <video ref={videoRef} className="w-full" />
            )}
            {result && (
              <div
                className={`absolute inset-0 flex items-center justify-center ${
                  result.success ? 'bg-green-500/90' : 'bg-red-500/90'
                }`}
              >
                <div className="text-white text-center p-6">
                  <div className="text-5xl mb-3">{result.success ? '✓' : '✗'}</div>
                  <p className="text-xl font-bold">{result.success ? result.name : result.error}</p>
                  {result.success && <p className="text-sm opacity-80">Checked in at {result.time}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'search' && <CheckInSearch eventId={eventId} />}

        {tab === 'manual' && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Enter registration ID:</p>
            <div className="flex gap-2">
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit()
                }}
                placeholder="Registration ID"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleManualSubmit}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Check in
              </button>
            </div>
            {result && (
              <div
                className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium text-white ${
                  result.success ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {result.success ? `${result.name} checked in at ${result.time}` : result.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Stats sidebar */}
      <div className="lg:w-72 shrink-0 border border-gray-200 rounded-xl p-4 bg-gray-50">
        <CheckInStatsPanel eventId={eventId} />
      </div>
    </div>
  )
}
