import PublicNav from '@/components/layout/PublicNav'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col overflow-x-hidden">
      {/* Background Accents */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] iridescent-glow blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-fixed/10 blur-[150px] rounded-full"></div>
        <div className="absolute inset-0 noise-overlay"></div>
      </div>
      <PublicNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-24">
        {children}
      </main>
      <footer className="bg-slate-800 text-slate-400 text-xs py-6 text-center">
        © 2026 GovEvent · Internal Government Use Only
      </footer>
    </div>
  )
}
