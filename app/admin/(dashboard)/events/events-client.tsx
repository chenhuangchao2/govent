"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

type EventRow = {
  id: string;
  title: string;
  venue: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registrationCount: number;
  isPublished: boolean;
  isCancelled: boolean;
  tags: string[];
  creatorName: string | null;
};

type TabKey = "all" | "published" | "draft" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All Events" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 10;

function getTagColor(_tag: string) {
  return "bg-surface-container-high text-on-surface-variant";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EventsClient({
  events,
  isSuperAdmin,
}: {
  events: EventRow[];
  isSuperAdmin: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (activeTab === "published") return e.isPublished && !e.isCancelled;
      if (activeTab === "draft") return !e.isPublished && !e.isCancelled;
      if (activeTab === "cancelled") return e.isCancelled;
      return true;
    });
  }, [events, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const totalCapacity = events.reduce((s, e) => s + e.capacity, 0);
  const totalRegistered = events.reduce((s, e) => s + e.registrationCount, 0);
  const utilPct = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;

  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const upcoming = events.filter(
    (e) => new Date(e.startTime) >= now && new Date(e.startTime) <= in90 && !e.isCancelled
  ).length;

  function handleTabChange(key: TabKey) {
    setActiveTab(key);
    setPage(1);
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">
            Event Registry
          </h1>
          <p className="text-on-surface-variant font-label text-sm tracking-wide">
            Manage and monitor all events across the organisation.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-label font-bold text-sm tracking-wider uppercase shadow-xl shadow-primary/25 hover:scale-105 transition-transform"
        >
          <PlusIcon className="w-4 h-4" />
          New Event
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Tabs */}
        <div className="col-span-2 glass-panel p-5 rounded-lg flex items-center gap-4">
          <FilterIcon className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold font-label border transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary/10 text-primary border-primary/15"
                    : "bg-white text-on-surface-variant border-outline-variant/20 hover:border-primary/20"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming stat */}
        <div className="glass-panel p-5 rounded-lg flex flex-col justify-center">
          <span className="text-xs font-bold font-label tracking-widest text-outline uppercase mb-1">
            Next 90 Days
          </span>
          <p className="font-headline font-bold text-primary text-lg">
            {upcoming} Event{upcoming !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Capacity stat */}
        <div className="glass-panel p-5 rounded-lg flex flex-col justify-center">
          <span className="text-xs font-bold font-label tracking-widest text-outline uppercase mb-1">
            Total Capacity
          </span>
          <p className="font-headline font-bold text-primary text-lg">{utilPct}% Utilised</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-lg overflow-hidden mb-8">
        {paged.length === 0 ? (
          <div className="px-8 py-20 text-center">
            <CalendarOffIcon className="w-12 h-12 text-outline-variant mx-auto mb-4" />
            <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
              {events.length === 0 ? "Create your first event" : "No events in this category"}
            </h3>
            <p className="text-on-surface-variant text-sm mb-6">
              {events.length === 0
                ? "Get started by creating a new event for your organisation."
                : "Try switching to a different tab."}
            </p>
            {events.length === 0 && (
              <Link
                href="/admin/events/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-label font-bold text-sm tracking-wider uppercase"
              >
                <PlusIcon className="w-4 h-4" />
                New Event
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/40">
                    <th className="px-8 py-4 text-xs font-label font-bold tracking-widest text-outline uppercase">
                      Event Title
                    </th>
                    <th className="px-6 py-4 text-xs font-label font-bold tracking-widest text-outline uppercase">
                      Scheduled Date
                    </th>
                    <th className="px-6 py-4 text-xs font-label font-bold tracking-widest text-outline uppercase">
                      Capacity Usage
                    </th>
                    <th className="px-6 py-4 text-xs font-label font-bold tracking-widest text-outline uppercase">
                      Status
                    </th>
                    {isSuperAdmin && (
                      <th className="px-6 py-4 text-xs font-label font-bold tracking-widest text-outline uppercase">
                        Lead Official
                      </th>
                    )}
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {paged.map((event) => {
                    const pct =
                      event.capacity > 0
                        ? Math.round((event.registrationCount / event.capacity) * 100)
                        : 0;
                    const isFull = event.registrationCount >= event.capacity;
                    const statusLabel = event.isCancelled
                      ? "Cancelled"
                      : event.isPublished
                        ? "Published"
                        : "Draft";

                    return (
                      <tr
                        key={event.id}
                        className="group hover:bg-surface-container-low/50 transition-colors"
                      >
                        {/* Title + tags */}
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/admin/events/${event.id}`}
                              className={`font-headline font-bold text-sm hover:text-primary transition-colors ${
                                event.isCancelled
                                  ? "text-outline line-through"
                                  : "text-on-surface"
                              }`}
                            >
                              {event.title}
                            </Link>
                            <span className="text-xs text-outline">{event.venue}</span>
                            {event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {event.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className={`px-2 py-0.5 text-xs font-bold font-label rounded-full ${getTagColor(tag)}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-5">
                          <div
                            className={`flex items-center gap-2 text-sm font-medium ${
                              event.isCancelled ? "text-outline" : "text-on-surface-variant"
                            }`}
                          >
                            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                            {formatDate(event.startTime)}
                          </div>
                        </td>

                        {/* Capacity bar */}
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1.5 w-32">
                            <div className="flex justify-between text-xs font-bold font-label text-outline uppercase">
                              <span>{pct}%</span>
                              <span>
                                {event.isCancelled ? "Void" : isFull ? "Locked" : "Open"}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  event.isCancelled
                                    ? "bg-error-container"
                                    : pct >= 90
                                      ? "bg-primary"
                                      : "bg-primary-container"
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-5">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-bold font-label tracking-widest uppercase rounded-full ${
                              event.isCancelled
                                ? "bg-error-container text-error"
                                : event.isPublished
                                  ? "bg-green-100 text-green-700"
                                  : "bg-surface-container text-outline"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        {/* Creator */}
                        {isSuperAdmin && (
                          <td className="px-6 py-5">
                            <div
                              className={`flex items-center gap-2 ${
                                event.isCancelled ? "opacity-50 grayscale" : ""
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
                                {(event.creatorName || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-on-surface-variant">
                                {event.creatorName || "Unknown"}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Arrow */}
                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="text-outline hover:text-primary transition-colors"
                          >
                            <ChevronRightIcon className="w-5 h-5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="px-8 py-5 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container/20">
                <span className="text-xs font-label font-semibold text-outline">
                  Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} Events
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-full border border-outline-variant/30 text-outline hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-full text-xs font-bold border transition-all ${
                        n === page
                          ? "border-primary text-primary bg-white shadow-sm"
                          : "border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-full border border-outline-variant/30 text-outline hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Inline SVG Icons ──

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CalendarOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
