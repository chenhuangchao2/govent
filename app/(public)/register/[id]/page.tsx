import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { RegistrationForm } from './registration-form'

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const event = await db.event.findUnique({
    where: { id, isPublished: true, isCancelled: false },
  })

  if (!event) notFound()

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden">
      {/* Ambient Background Accents */}
      <div className="state-glow w-[600px] h-[600px] top-[-100px] right-[-100px]" />
      <div className="state-glow w-[600px] h-[600px] bottom-[-200px] left-[-200px] opacity-50" />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Event Summary Card */}
        <section className="glass-panel p-10 rounded-lg flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-blue-900/5">
          {event.imageUrl && (
            <div className="w-full md:w-1/3 aspect-[4/3] rounded-lg overflow-hidden relative group shrink-0">
              <img
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src={event.imageUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent" />
            </div>
          )}
          <div className="flex-grow space-y-4">
            {event.tags.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold tracking-widest uppercase font-label">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {event.tags[0]}
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter font-headline text-primary leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-on-surface-variant font-medium text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span className="font-headline tracking-tight">{formatDate(event.startTime)}</span>
              </div>
              {!event.venueHidden && event.venue && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span className="font-headline tracking-tight">{event.venue}</span>
                </div>
              )}
              {event.isPaid && event.price && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-headline tracking-tight">SGD {event.price.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Registration Form */}
        <RegistrationForm
          eventId={event.id}
          eventTitle={event.title}
          isPaid={event.isPaid}
          price={event.price}
          allowedDomains={event.allowedDomains}
          allowedOrganisations={event.allowedOrganisations}
        />
      </div>
    </main>
  )
}
