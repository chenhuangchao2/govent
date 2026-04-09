import { db } from '@/lib/db'
import Link from 'next/link'
import EventGrid from '@/components/features/EventGrid'

export const revalidate = 30

export default async function EventsPage() {
  const events = await db.event.findMany({
    where: { isPublished: true, isCancelled: false },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
    orderBy: { startTime: 'asc' },
  })

  const now = new Date()
  const serialized = events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    venue: e.venue,
    capacity: e.capacity,
    registeredCount: e._count.registrations,
    isPaid: e.isPaid,
    price: e.price,
    allowedDomains: e.allowedDomains,
    allowedOrganisations: e.allowedOrganisations,
    tags: e.tags,
    imageUrl: e.imageUrl,
  }))

  // Split: featured (nearest future) vs remaining
  const futureEvents = serialized.filter(e => new Date(e.startTime) > now)
  const featuredEvent = futureEvents[0] || null
  const secondaryEvent = futureEvents[1] || null
  const gridEvents = serialized // pass all to grid, it handles filtering

  return (
    <div>
      {/* Hero Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <h1 className="text-6xl md:text-7xl font-headline font-extrabold tracking-tighter text-on-surface mb-4 leading-[0.9]">
            Public<br/>Initiatives.
          </h1>
          <p className="text-lg text-on-surface-variant font-medium max-w-md">
            Explore upcoming government events, workshops and training sessions. Register and manage your professional development.
          </p>
        </div>
      </header>

      {/* Featured Section (8:4 Asymmetric) */}
      {featuredEvent && (
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Featured Event */}
            <Link href={`/events/${featuredEvent.id}`} className="lg:col-span-8 group relative overflow-hidden rounded-xl h-[500px] shadow-2xl shadow-primary/5 cursor-pointer block">
              {featuredEvent.imageUrl ? (
                <img className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={featuredEvent.imageUrl} alt={featuredEvent.title} />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-10 w-full">
                <div className="flex items-center gap-3 mb-4">
                  {featuredEvent.tags[0] && (
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase font-label">{featuredEvent.tags[0]}</span>
                  )}
                  <span className="text-white/80 font-label text-[10px] font-bold tracking-widest uppercase">
                    {new Date(featuredEvent.startTime).toLocaleDateString('en-SG', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-white tracking-tighter mb-4 max-w-xl">
                  {featuredEvent.title}
                </h2>
                <div className="flex items-center justify-between">
                  <p className="text-white/70 font-medium max-w-md line-clamp-2">{featuredEvent.description}</p>
                  <div className="bg-white text-primary p-4 rounded-full flex items-center justify-center hover:scale-110 transition-transform shrink-0 ml-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Secondary Featured Card */}
            {secondaryEvent && (
              <Link href={`/events/${secondaryEvent.id}`} className="lg:col-span-4 bg-surface-container-lowest glass-panel p-8 rounded-xl flex flex-col justify-between shadow-xl shadow-slate-200/50 block">
                <div>
                  <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <h3 className="text-2xl font-headline font-bold tracking-tight text-on-surface mb-3">{secondaryEvent.title}</h3>
                  <p className="text-on-surface-variant font-medium leading-relaxed line-clamp-3">{secondaryEvent.description}</p>
                </div>
                <div className="mt-8 pt-6 border-t border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-outline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span className="text-xs font-bold font-label text-outline uppercase tracking-wider">
                      {new Date(secondaryEvent.startTime).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })} &middot; {new Date(secondaryEvent.startTime).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="w-full py-4 bg-surface-container text-primary font-bold font-label uppercase tracking-widest text-[11px] rounded-xl hover:bg-primary hover:text-white transition-all text-center">
                    View Details
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Event Grid with Filters */}
      <EventGrid events={gridEvents} />

      {/* CPD Placeholder Section */}
      <section className="mt-24 p-12 bg-surface-container/30 glass-panel rounded-xl border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 iridescent-glow opacity-40 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/2">
            <span className="font-label text-[11px] font-black tracking-[0.2em] text-primary uppercase mb-4 block">Professional Development</span>
            <h2 className="text-5xl font-headline font-extrabold tracking-tighter mb-6">For Your Career.</h2>
            <p className="text-lg text-on-surface-variant font-medium mb-8 leading-relaxed">
              Track your CPD hours across all registered events. Build your professional development portfolio within the government ecosystem.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-outline-variant/10">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                <span className="text-sm font-bold text-on-surface">CPD Hours Tracker</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-outline-variant/10">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span className="text-sm font-bold text-on-surface">Event Certificates</span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 grid grid-cols-2 gap-4">
            <div className="h-48 rounded-xl bg-surface-container overflow-hidden">
              <img className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500" src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=500&auto=format&fit=crop" alt="Team collaboration" />
            </div>
            <div className="h-48 rounded-xl bg-surface-container overflow-hidden mt-8">
              <img className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500" src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=500&auto=format&fit=crop" alt="Modern office" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
