'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed bottom-8 right-8 z-50 bg-[#1a365d] text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-[#1a365d]/90 transition-colors flex items-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
      </svg>
      Print Certificate
    </button>
  )
}

export function BackButton() {
  return (
    <a
      href="/my-registrations"
      className="print:hidden fixed bottom-8 left-8 z-50 bg-white text-[#1a365d] border-2 border-[#1a365d] px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
      </svg>
      Back to My Registrations
    </a>
  )
}
