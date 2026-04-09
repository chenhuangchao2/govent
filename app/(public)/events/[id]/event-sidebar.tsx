"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Props = {
  eventId: string;
  title: string;
  isPaid: boolean;
  price: number | null;
  registrationDeadline: string; // ISO
  capacity: number;
  registered: number;
  isFull: boolean;
  isPastDeadline: boolean;
};

type TimeLeft = {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  expired: boolean;
};

function calcTimeLeft(deadline: string): TimeLeft {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// ── Icons ──

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

export function EventSidebar({
  eventId,
  title,
  isPaid,
  price,
  registrationDeadline,
  capacity,
  registered,
  isFull,
  isPastDeadline: initialPastDeadline,
}: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calcTimeLeft(registrationDeadline)
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPastDeadline = initialPastDeadline || timeLeft.expired;
  const capacityPercent = capacity > 0 ? Math.min((registered / capacity) * 100, 100) : 0;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calcTimeLeft(registrationDeadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [registrationDeadline]);

  // Check auth + existing registration
  const checkStatus = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/participant/me");
      const meJson = await meRes.json();

      if (!meJson.data) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // Check if already registered
      const regRes = await fetch("/api/my-registrations");
      const regJson = await regRes.json();

      if (regJson.data && Array.isArray(regJson.data)) {
        const match = regJson.data.find(
          (r: { event: { id: string }; status: string }) => r.event.id === eventId
        );
        if (match) {
          setExistingStatus(match.status);
        }
      }
    } catch {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // ── Status badge rendering ──
  function renderStatusBadge(status: string) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending Review" },
      APPROVED: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
      WAITLISTED: { bg: "bg-blue-100", text: "text-blue-800", label: "Waitlisted" },
      PENDING_PAYMENT: { bg: "bg-orange-100", text: "text-orange-800", label: "Pending Payment" },
      PAYMENT_FAILED: { bg: "bg-red-100", text: "text-red-800", label: "Payment Failed" },
      ATTENDED: { bg: "bg-green-100", text: "text-green-800", label: "Attended" },
      NO_SHOW: { bg: "bg-slate-100", text: "text-slate-800", label: "No Show" },
      CANCELLED: { bg: "bg-slate-100", text: "text-slate-800", label: "Cancelled" },
    };
    const s = map[status] || { bg: "bg-slate-100", text: "text-slate-700", label: status };
    return (
      <span className={`${s.bg} ${s.text} px-3 py-1 rounded-full text-xs font-bold tracking-wider`}>
        {s.label}
      </span>
    );
  }

  // ── CTA button logic ──
  function renderCTA() {
    if (loading) {
      return (
        <div className="w-full py-5 rounded-full bg-surface-container animate-pulse" />
      );
    }

    // Already registered (active status)
    if (existingStatus && !["CANCELLED", "REJECTED"].includes(existingStatus)) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <CheckCircleIcon />
            <span className="font-bold text-on-surface">You are registered</span>
          </div>
          <div className="flex justify-center">{renderStatusBadge(existingStatus)}</div>
          <Link
            href="/my-registrations"
            className="block w-full text-center py-4 bg-surface-container text-primary font-bold rounded-full hover:bg-surface-container-high transition-colors text-sm"
          >
            View My Registrations
          </Link>
        </div>
      );
    }

    // Registration closed
    if (isPastDeadline) {
      return (
        <button
          disabled
          className="w-full py-5 rounded-full font-extrabold text-lg bg-surface-container text-outline cursor-not-allowed"
        >
          Registration Closed
        </button>
      );
    }

    // Not logged in
    if (!isLoggedIn) {
      return (
        <Link
          href={`/login?redirect=/events/${eventId}`}
          className="block w-full text-center bg-gradient-to-r from-primary to-primary-container text-white py-5 rounded-full font-extrabold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          Sign In to Register
        </Link>
      );
    }

    // Logged in, can register
    const label = isFull ? "Join Waitlist" : "Register Now";
    return (
      <Link
        href={`/register/${eventId}`}
        className="block w-full text-center bg-gradient-to-r from-primary to-primary-container text-white py-5 rounded-full font-extrabold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-8 rounded-xl shadow-2xl">
        {/* Header: Status + Price */}
        <div className="flex justify-between items-center mb-6">
          {!isPastDeadline ? (
            <span className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Registering Now
            </span>
          ) : (
            <span className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
              <ClockIcon />
              Closed
            </span>
          )}
          {isPaid && price != null && (
            <div className="text-right">
              <p className="text-2xl font-black text-primary">${price.toFixed(2)}</p>
            </div>
          )}
          {!isPaid && (
            <div className="text-right">
              <p className="text-2xl font-black text-primary">Free</p>
            </div>
          )}
        </div>

        {/* Countdown */}
        {!isPastDeadline && (
          <div className="bg-surface-container-highest/30 rounded-lg p-5 mb-8">
            <p className="text-center text-xs font-bold text-outline tracking-widest uppercase mb-3">
              Registration Closes in:
            </p>
            <div className="flex justify-between">
              {[
                { value: timeLeft.days, label: "Days" },
                { value: timeLeft.hours, label: "Hours" },
                { value: timeLeft.mins, label: "Mins" },
                { value: timeLeft.secs, label: "Secs" },
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-0">
                  <div className="text-center">
                    <span className="block text-xl font-black text-on-surface">
                      {pad(unit.value)}
                    </span>
                    <span className="text-[10px] font-bold text-outline uppercase">
                      {unit.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <span className="text-xl font-bold opacity-30 mx-2">:</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mb-6">{renderCTA()}</div>

        {/* Capacity Status */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-on-surface-variant font-medium">Availability</span>
            <span className={`font-bold ${isFull ? "text-error" : "text-green-600"}`}>
              {isFull ? "Waitlist Open" : "Seats Available"}
            </span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isFull ? "bg-error" : "bg-green-600"}`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* Extra Info */}
        <div className="mt-8 pt-8 border-t border-outline-variant/20 space-y-4">
          <div className="flex items-center gap-3 text-sm font-medium text-on-surface-variant">
            <AwardIcon />
            Digital Certificate Included
          </div>
        </div>
      </div>
    </div>
  );
}
