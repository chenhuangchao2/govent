import PublicNav from '@/components/layout/PublicNav'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <footer className="bg-slate-800 text-slate-400 text-xs py-6 text-center">
        © 2026 GovEvent · Internal Government Use Only
      </footer>
    </div>
  )
}
