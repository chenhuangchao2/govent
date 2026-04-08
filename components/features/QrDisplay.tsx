'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function QrDisplay({ registrationId }: { registrationId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(registrationId, { width: 200, margin: 2 }).then(setDataUrl)
  }, [registrationId])

  if (!dataUrl) return <div className="w-[200px] h-[200px] bg-gray-100 animate-pulse rounded" />
  return <img src={dataUrl} alt="QR Code" width={200} height={200} className="rounded border" />
}
