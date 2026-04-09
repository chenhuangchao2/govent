"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CAREER_IMAGES = {
  left: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=500&auto=format&fit=crop",
  right:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=500&auto=format&fit=crop",
};

interface Registration {
  status: string;
  event: {
    cpdHours: number;
  };
}

export default function CpdSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cpdHours, setCpdHours] = useState(0);
  const [eventsAttended, setEventsAttended] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const meRes = await fetch("/api/auth/participant/me");
        const meJson = await meRes.json();

        if (!meJson.data) {
          setLoaded(true);
          return;
        }

        setIsLoggedIn(true);

        const regRes = await fetch("/api/my-registrations");
        const regJson = await regRes.json();

        if (regJson.data && Array.isArray(regJson.data)) {
          const attended = regJson.data.filter(
            (r: Registration) => r.status === "ATTENDED"
          );
          const totalCpd = attended.reduce(
            (sum: number, r: Registration) => sum + (r.event.cpdHours ?? 0),
            0
          );
          setCpdHours(totalCpd);
          setEventsAttended(attended.length);
        }
      } catch {
        // silently fail — show default state
      } finally {
        setLoaded(true);
      }
    }

    fetchData();
  }, []);

  return (
    <section className="mt-24 p-12 bg-surface-container/30 glass-panel rounded-xl border-none relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 iridescent-glow opacity-40 blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
        <div className="md:w-1/2">
          <span className="font-label text-[11px] font-black tracking-[0.2em] text-primary uppercase mb-4 block">
            Professional Development
          </span>
          <h2 className="text-5xl font-extrabold tracking-tighter mb-6">
            For Your Career.
          </h2>

          {loaded && isLoggedIn ? (
            /* ── Logged-in: show progress stats ── */
            <div>
              <p className="text-sm font-bold font-label tracking-[0.15em] text-on-surface-variant uppercase mb-6">
                Your Progress
              </p>
              <div className="flex gap-8 mb-8">
                <div>
                  <span className="text-5xl font-extrabold tracking-tighter text-primary block">
                    {cpdHours % 1 === 0 ? cpdHours : cpdHours.toFixed(1)}
                  </span>
                  <span className="text-[11px] font-black font-label tracking-[0.2em] text-on-surface-variant uppercase mt-1 block">
                    CPD Hours
                  </span>
                </div>
                <div className="w-px bg-outline-variant/30" />
                <div>
                  <span className="text-5xl font-extrabold tracking-tighter text-primary block">
                    {eventsAttended}
                  </span>
                  <span className="text-[11px] font-black font-label tracking-[0.2em] text-on-surface-variant uppercase mt-1 block">
                    Events Attended
                  </span>
                </div>
              </div>
              <Link
                href="/my-registrations"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                View My Registrations
              </Link>
            </div>
          ) : (
            /* ── Not logged in: show description + badges ── */
            <div>
              <p className="text-lg text-on-surface-variant font-medium mb-8 leading-relaxed">
                Track your CPD hours across all registered events. Build your
                professional development portfolio within the government
                ecosystem.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-outline-variant/10">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-sm font-bold text-on-surface">
                    CPD Hours Tracker
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-outline-variant/10">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-bold text-on-surface">
                    Event Certificates
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right side: decorative images ── */}
        <div className="md:w-1/2 grid grid-cols-2 gap-4">
          <div className="h-48 rounded-xl bg-surface-container overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CAREER_IMAGES.left}
              alt="Business people collaborating in modern office"
              className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500"
            />
          </div>
          <div className="h-48 rounded-xl bg-surface-container overflow-hidden mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CAREER_IMAGES.right}
              alt="Modern geometric architecture with blue tinted glass"
              className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 transition-all duration-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
