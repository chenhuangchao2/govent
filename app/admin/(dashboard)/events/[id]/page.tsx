import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EventTabs } from "./event-tabs";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true, email: true } },
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

  // Ownership check
  if (!session.isSuperAdmin && event.creatorId !== session.userId) {
    redirect("/admin/events");
  }

  const statusLabel = event.isCancelled
    ? "Cancelled"
    : event.isPublished
      ? "Published"
      : "Draft";

  const statusColor = event.isCancelled
    ? "bg-error/10 text-error"
    : event.isPublished
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Serialize event for client component
  const serializedEvent = {
    ...event,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    registrationDeadline: event.registrationDeadline.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <a
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </a>

      {/* Header */}
      <div className="glass-card rounded-md p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black font-headline text-on-surface truncate">
                {event.title}
              </h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}
              >
                {statusLabel}
              </span>
              {event.isPaid && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  Paid (${event.price?.toFixed(2)})
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(event.startTime)} - {formatDate(event.endTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event._count.registrations} / {event.capacity} registered
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <EventTabs event={serializedEvent} />
    </div>
  );
}
