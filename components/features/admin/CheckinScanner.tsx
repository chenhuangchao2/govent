'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'

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

  useEffect(() => {
    loadCount()
    const reader = new BrowserQRCodeReader()
    readerRef.current = reader
    if (videoRef.current) {
      reader.decodeFromVideoDevice(undefined, videoRef.current, async (res) => {
        if (!res) return
        const id = res.getText()
        if (id === lastScanned.current) return
        lastScanned.current = id
        await processCheckin(id)
        setTimeout(() => { lastScanned.current = null }, 3000)
      })
    }
    return () => { BrowserQRCodeReader.releaseAllStreams() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setResult({ success: true, name: data.data.name, time: new Date(data.data.checkedInAt).toLocaleTimeString('en-SG') })
      setAttendedCount(c => c + 1)
    } else {
      setResult({ success: false, error: data.error })
    }
    setTimeout(() => setResult(null), 3000)
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-4">
        <span className="text-2xl font-bold text-gray-900">{attendedCount} checked in</span>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black" style={{ maxWidth: 400 }}>
        <video ref={videoRef} className="w-full" />
        {result && (
          <div className={`absolute inset-0 flex items-center justify-center ${result.success ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
            <div className="text-white text-center p-6">
              <div className="text-5xl mb-3">{result.success ? '✓' : '✗'}</div>
              <p className="text-xl font-bold">{result.success ? result.name : result.error}</p>
              {result.success && <p className="text-sm opacity-80">Checked in at {result.time}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-500 mb-2">Manual check-in (enter registration ID):</p>
        <div className="flex gap-2">
          <input value={manualId} onChange={e => setManualId(e.target.value)}
            placeholder="Registration ID" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
          <button onClick={() => { if (manualId) processCheckin(manualId) }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Check in</button>
        </div>
      </div>
    </div>
  )
}
