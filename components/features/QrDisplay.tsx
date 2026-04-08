'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'

export default function QrDisplay({ registrationId, eventTitle }: { registrationId: string; eventTitle?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    QRCode.toDataURL(registrationId, { width: 200, margin: 2 }).then(setDataUrl)
  }, [registrationId])

  const handlePrint = () => {
    if (!dataUrl) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${eventTitle || 'Event Registration'}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; margin: 0; }
            h2 { font-size: 18px; color: #1f2937; margin-bottom: 8px; }
            p { font-size: 12px; color: #6b7280; margin: 4px 0; }
            img { margin: 16px 0; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h2>${eventTitle || 'Event Registration'}</h2>
          <img src="${dataUrl}" width="250" height="250" />
          <p>Registration ID: ${registrationId.slice(0, 8)}...</p>
          <p>Show this QR code at the event entrance</p>
          <br/>
          <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:6px;background:#fff;">Print</button>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!dataUrl) return <div className="w-[200px] h-[200px] bg-gray-100 animate-pulse rounded" />

  return (
    <div ref={printRef}>
      <img src={dataUrl} alt="QR Code" width={200} height={200} className="rounded border" />
      <button
        onClick={handlePrint}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" />
        Print QR Code
      </button>
    </div>
  )
}
