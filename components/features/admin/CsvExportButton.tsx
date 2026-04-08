'use client'

import { Download } from 'lucide-react'

interface CsvExportButtonProps {
  eventId: string
}

export default function CsvExportButton({ eventId }: CsvExportButtonProps) {
  const handleExport = () => {
    window.open(`/api/registrations/export?eventId=${eventId}`)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  )
}
