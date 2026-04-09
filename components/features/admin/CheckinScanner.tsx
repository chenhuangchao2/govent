'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Camera, Search } from 'lucide-react'
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
  const [tab, setTab] = useState<'qr' | 'search'>('search')
  const [cameraError, setCameraError] = useState(false)
  const [cameraStarted, setCameraStarted] = useState(false)

  useEffect(() => {
    loadCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clean up camera when leaving QR tab
  useEffect(() => {
    if (tab !== 'qr') {
      setCameraStarted(false)
      BrowserQRCodeReader.releaseAllStreams()
    }
  }, [tab])

  // Start camera after video element is mounted
  useEffect(() => {
    if (!cameraStarted || tab !== 'qr') return

    // Small delay to let video element mount
    const timeout = setTimeout(async () => {
      const reader = new BrowserQRCodeReader()
      readerRef.current = reader

      if (!videoRef.current) { setCameraError(true); return }
      try {
        await reader.decodeFromVideoDevice(undefined, videoRef.current, async (res) => {
          if (!res) return
          const id = res.getText()
          if (id === lastScanned.current) return
          lastScanned.current = id
          await processCheckin(id)
          setTimeout(() => { lastScanned.current = null }, 3000)
        })
        setCameraError(false)
      } catch {
        setCameraError(true)
        setCameraStarted(false)
      }
    }, 100)

    return () => {
      clearTimeout(timeout)
      BrowserQRCodeReader.releaseAllStreams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStarted, tab])

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

  const tabs = [
    { key: 'qr' as const, label: 'QR Scanner', icon: Camera },
    { key: 'search' as const, label: 'Search', icon: Search },
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
                  <p className="text-xs text-gray-500 mt-1">Check browser permissions, or use Search tab</p>
                </div>
              </div>
            ) : !cameraStarted ? (
              <div className="flex items-center justify-center h-64 bg-gray-100 text-center p-6">
                <div>
                  <Camera className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium mb-3">Ready to scan QR codes</p>
                  <button
                    onClick={() => setCameraStarted(true)}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Start Camera
                  </button>
                  <p className="text-xs text-gray-400 mt-2">Browser will ask for camera permission</p>
                </div>
              </div>
            ) : (
              <video ref={videoRef} className="w-full" autoPlay playsInline />
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
      </div>

      {/* Right: Stats sidebar */}
      <div className="lg:w-72 shrink-0 border border-gray-200 rounded-xl p-4 bg-gray-50">
        <CheckInStatsPanel eventId={eventId} />
      </div>
    </div>
  )
}
