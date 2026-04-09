import Link from "next/link";
import { db } from "@/lib/db";
import EventFilters from "./event-filters";
import CpdSection from "./cpd-section";

export const dynamic = "force-dynamic";

function formatFeaturedDate(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

function formatSecondaryTime(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${month} ${day} · ${time}`;
}

export default async function EventsPage() {
  const events = await db.event.findMany({
    where: { isPublished: true, isCancelled: false },
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
    orderBy: { startTime: "asc" },
  });

  const now = new Date();
  const futureEvents = events.filter((e) => e.startTime > now);
  const featuredEvents = events.filter((e) => e.isFeatured);
  const featured = featuredEvents[0] ?? futureEvents[0] ?? events[0] ?? null;
  const secondary = featuredEvents[1] ?? futureEvents.find((e) => e.id !== featured?.id) ?? null;

  // Serialize dates for client component
  const serializedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    venue: e.venue,
    capacity: e.capacity,
    tags: e.tags,
    allowedOrganisations: e.allowedOrganisations,
    isPaid: e.isPaid,
    price: e.price,
    imageUrl: e.imageUrl,
    isFeatured: e.isFeatured,
    _count: e._count,
  }));

  return (
    <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      {/* ── Header: Title left, Description right, aligned to bottom ── */}
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
          <h1
            className="text-6xl md:text-7xl font-extrabold tracking-tighter text-on-surface shrink-0"
            style={{ lineHeight: 0.9 }}
          >
            Public
            <br />
            Initiatives.
          </h1>
          <p className="text-[15px] text-on-surface-variant font-medium max-w-[380px] leading-relaxed pb-1">
            Explore upcoming government events, workshops and training sessions.
            Register and manage your professional development.
          </p>
        </div>
      </header>

      {/* ── Featured Section (8:4 Asymmetric) ── */}
      {featured && (
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Featured Event */}
            <Link
              href={`/events/${featured.id}`}
              className="lg:col-span-8 group relative overflow-hidden rounded-xl h-[500px] shadow-2xl shadow-primary/5 cursor-pointer block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop"}
                alt={featured.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-10 w-full">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase font-label">
                    {featured.tags[0] || "Event"}
                  </span>
                  <span className="text-white/80 font-label text-[10px] font-bold tracking-widest uppercase">
                    {formatFeaturedDate(featured.startTime)}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-4 max-w-xl">
                  {featured.title}
                </h2>
                <div className="flex items-center justify-between">
                  <p className="text-white/70 font-medium max-w-md">
                    {featured.description}
                  </p>
                  <span className="bg-white text-primary p-4 rounded-full flex items-center justify-center hover:scale-110 transition-transform shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 17L17 7M17 7H7M17 7v10"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>

            {/* Secondary Featured Card */}
            {secondary && (
              <Link
                href={`/events/${secondary.id}`}
                className="lg:col-span-4 bg-surface-container-lowest glass-panel p-8 rounded-xl flex flex-col justify-between shadow-xl shadow-slate-200/50 block"
              >
                <div>
                  <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center mb-6">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-on-surface mb-3">
                    {secondary.title}
                  </h3>
                  <p className="text-on-surface-variant font-medium leading-relaxed">
                    {secondary.description}
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-4">
                    <svg
                      className="w-4 h-4 text-outline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs font-bold font-label text-outline uppercase tracking-wider">
                      {formatSecondaryTime(secondary.startTime)}
                    </span>
                  </div>
                  <span className="block w-full py-4 bg-surface-container text-primary font-bold font-label uppercase tracking-widest text-[11px] rounded-xl hover:bg-primary hover:text-white transition-all text-center">
                    View Details
                  </span>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Event Grid with Filters ── */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Active Registries
          </h2>
        </div>

        <EventFilters events={serializedEvents} />
      </section>

      {/* ── CPD / Career Section ── */}
      <CpdSection />
    </main>
  );
}
