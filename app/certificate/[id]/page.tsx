import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PrintButton, BackButton } from './certificate-actions'

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Data Fetching                                                      */
/* ------------------------------------------------------------------ */

async function getCertificateData(id: string) {
  const registration = await db.registration.findUnique({
    where: { id },
    include: { event: true },
  })
  if (!registration || registration.status !== 'ATTENDED') return null
  return registration
}

/* ------------------------------------------------------------------ */
/*  Date Formatting                                                    */
/* ------------------------------------------------------------------ */

function formatEventDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatIssuedDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const registration = await getCertificateData(id)
  if (!registration) notFound()

  const eventDate = formatEventDate(new Date(registration.event.startTime))
  const issuedDate = formatIssuedDate(new Date())
  const cpdHours = registration.event.cpdHours

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > div:first-child {
            display: none !important;
          }
          .certificate-page {
            min-height: 100vh;
            padding: 0;
          }
          .certificate-wrapper {
            box-shadow: none !important;
            margin: 0 auto;
          }
        }
        @page {
          size: A4 landscape;
          margin: 0.5in;
        }
      `}</style>

      <div className="certificate-page min-h-screen bg-white flex items-center justify-center p-8">
        <div className="certificate-wrapper max-w-2xl w-full mx-auto relative">
          {/* Outer decorative border */}
          <div className="absolute inset-0 border-2 border-[#1a365d]/20 rounded-sm" />
          <div className="absolute inset-[6px] border border-[#1a365d]/10 rounded-sm" />

          {/* Certificate content */}
          <div className="relative p-16 text-center">
            {/* Top gradient line */}
            <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-[#1a365d] to-transparent" />

            {/* Logo & Header */}
            <div className="mb-2">
              <div className="flex items-center justify-center gap-3 mb-1">
                <svg className="w-8 h-8 text-[#1a365d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                </svg>
                <span className="text-2xl font-bold tracking-wide text-[#1a365d]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                  GovEvent
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 bg-[#1a365d]/20" />
              <svg className="w-4 h-4 text-[#c9a84c]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <div className="h-px w-16 bg-[#1a365d]/20" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold tracking-widest uppercase text-[#1a365d] mb-10" style={{ fontFamily: 'var(--font-manrope), sans-serif', letterSpacing: '0.15em' }}>
              Certificate of Attendance
            </h1>

            {/* Body */}
            <p className="text-gray-500 text-sm tracking-wider uppercase mb-4">
              This is to certify that
            </p>

            <h2 className="text-3xl font-bold text-[#1a365d] mb-1" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
              {registration.name}
            </h2>

            {/* Underline for name */}
            <div className="mx-auto w-48 h-px bg-[#c9a84c] mb-6" />

            <p className="text-gray-500 text-sm tracking-wider uppercase mb-4">
              has successfully attended
            </p>

            <h3 className="text-2xl font-semibold text-[#2d3748] mb-8" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
              {registration.event.title}
            </h3>

            {/* Event details */}
            <div className="space-y-2 mb-8 text-gray-600 text-sm">
              <p>
                <span className="font-semibold text-gray-700">Date:</span>{' '}
                {eventDate}
              </p>
              {registration.event.venue && (
                <p>
                  <span className="font-semibold text-gray-700">Venue:</span>{' '}
                  {registration.event.venue}
                </p>
              )}
              {cpdHours != null && cpdHours > 0 && (
                <p>
                  <span className="font-semibold text-gray-700">CPD Hours Awarded:</span>{' '}
                  <span className="text-[#1a365d] font-bold">{cpdHours}</span>
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px flex-1 bg-[#1a365d]/10" />
              <svg className="w-3 h-3 text-[#c9a84c]" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="4" />
              </svg>
              <div className="h-px flex-1 bg-[#1a365d]/10" />
            </div>

            {/* Footer */}
            <div className="space-y-1">
              <p className="text-gray-700 text-sm font-semibold">
                Issued by GovEvent
              </p>
              <p className="text-gray-400 text-xs">
                {issuedDate}
              </p>
            </div>

            {/* Registration ID */}
            <p className="mt-8 text-gray-300 text-[10px] tracking-wider">
              Registration ID: {registration.id}
            </p>

            {/* Bottom gradient line */}
            <div className="absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-[#1a365d] to-transparent" />
          </div>
        </div>
      </div>

      {/* Action buttons — hidden when printing */}
      <PrintButton />
      <BackButton />
    </>
  )
}
