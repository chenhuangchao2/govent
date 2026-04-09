import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  const events = await db.event.findMany({
    where: session.isSuperAdmin ? {} : { creatorId: session.userId },
    include: {
      _count: {
        select: {
          registrations: {
            where: {
              status: {
                in: ["PENDING", "APPROVED", "PENDING_PAYMENT"],
              },
            },
          },
        },
      },
      creator: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const serialised = events.map((e) => ({
    id: e.id,
    title: e.title,
    venue: e.venue,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    capacity: e.capacity,
    registrationCount: e._count.registrations,
    isPublished: e.isPublished,
    isCancelled: e.isCancelled,
    tags: e.tags,
    creatorName: e.creator?.name ?? null,
  }));

  return (
    <EventsClient
      events={serialised}
      isSuperAdmin={session.isSuperAdmin || false}
    />
  );
}
