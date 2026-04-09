import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EventSidebar } from "./event-sidebar";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Inline SVG Icons ──

function ArrowBackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id, isPublished: true, isCancelled: false },
    include: {
      _count: {
        select: {
          registrations: {
            where: {
              status: { in: ["PENDING", "APPROVED", "PENDING_PAYMENT"] },
            },
          },
        },
      },
    },
  });

  if (!event) notFound();

  const registered = event._count.registrations;
  const available = event.capacity - registered;
  const isFull = available <= 0;
  const isPastDeadline = new Date() > new Date(event.registrationDeadline);

  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const dateStr = formatDate(startDate);
  const timeStr = `${formatTime(startDate)} — ${formatTime(endDate)}`;

  // Build eligibility label
  const eligibilityParts: string[] = [];
  if (event.allowedOrganisations.length > 0) {
    eligibilityParts.push(event.allowedOrganisations.join(", "));
  }
  if (event.allowedDomains.length > 0) {
    eligibilityParts.push(event.allowedDomains.join(", "));
  }
  const eligibilityLabel = eligibilityParts.length > 0 ? eligibilityParts.join(" / ") : "Open to All";

  return (
    <main className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
      {/* Back Link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-primary font-medium mb-8 hover:translate-x-[-4px] transition-transform"
      >
        <ArrowBackIcon />
        <span className="font-label tracking-wider text-sm uppercase">Back to Events</span>
      </Link>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 state-glow" />

        {/* ── Main Content (Left) ── */}
        <div className="lg:col-span-8 space-y-8">
          {/* Hero Section */}
          <section className="relative h-[480px] w-full rounded-xl overflow-hidden group">
            {event.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  src={event.imageUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-secondary" />
            )}

            <div className="absolute bottom-0 left-0 p-10 w-full">
              {/* Tag & Price Pills */}
              <div className="flex flex-wrap gap-3 mb-6">
                {event.tags.length > 0 && (
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                    {event.tags.join(" / ")}
                  </span>
                )}
                {event.isPaid && event.price != null && (
                  <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                    ${event.price.toFixed(2)}
                  </span>
                )}
                {!event.isPaid && (
                  <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                    Free
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter mb-4 max-w-2xl">
                {event.title}
              </h1>
            </div>
          </section>

          {/* Bento Grid Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date & Time */}
            <div className="glass-panel p-6 rounded-lg group hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <CalendarIcon />
                </div>
                <span className="font-label text-xs font-semibold tracking-widest text-outline uppercase">
                  Date &amp; Time
                </span>
              </div>
              <p className="font-bold text-lg">{dateStr}</p>
              <p className="text-on-surface-variant text-sm">{timeStr}</p>
            </div>

            {/* Venue */}
            <div className="glass-panel p-6 rounded-lg group hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                  <LocationIcon />
                </div>
                <span className="font-label text-xs font-semibold tracking-widest text-outline uppercase">
                  Venue
                </span>
              </div>
              <p className="font-bold text-lg">{event.venue || "TBC"}</p>
            </div>

            {/* Accreditation */}
            <div className="glass-panel p-6 rounded-lg group hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-tertiary/10 rounded-xl text-tertiary">
                  <ShieldCheckIcon />
                </div>
                <span className="font-label text-xs font-semibold tracking-widest text-outline uppercase">
                  Accreditation
                </span>
              </div>
              <p className="font-bold text-lg">
                {event.cpdHours > 0 ? `${event.cpdHours} CPD Hours` : "No CPD"}
              </p>
              <p className="text-on-surface-variant text-sm">{eligibilityLabel}</p>
            </div>
          </div>

          {/* Description */}
          <section className="glass-panel p-10 rounded-xl space-y-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-primary">
              About This Event
            </h2>
            <p className="text-lg text-on-surface-variant leading-relaxed font-medium whitespace-pre-line">
              {event.description}
            </p>
          </section>
        </div>

        {/* ── Registration Sidebar (Right) ── */}
        <aside className="lg:col-span-4 sticky top-28">
          <EventSidebar
            eventId={event.id}
            title={event.title}
            isPaid={event.isPaid}
            price={event.price}
            registrationDeadline={event.registrationDeadline.toISOString()}
            capacity={event.capacity}
            registered={registered}
            isFull={isFull}
            isPastDeadline={isPastDeadline}
          />
        </aside>
      </div>
    </main>
  );
}
