"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function PublicNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/participant/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) setUser(d.data);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/participant/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/events";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3 glass-panel rounded-full mt-4 mx-auto w-[95%] max-w-7xl shadow-[0_8px_32px_0_rgba(0,71,141,0.08)]">
      {/* Logo */}
      <Link href="/events" className="flex items-center gap-2">
        <span className="text-lg font-black text-blue-900 tracking-tighter uppercase font-headline">
          GovEvent
        </span>
      </Link>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        <Link
          href="/events"
          className={`font-label uppercase tracking-widest text-[11px] font-bold pb-1 transition-opacity ${
            pathname === "/events" || pathname.startsWith("/events/")
              ? "text-blue-700 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-blue-900"
          }`}
        >
          Events
        </Link>
        <Link
          href="/my-registrations"
          className={`font-label uppercase tracking-widest text-[11px] font-bold pb-1 transition-opacity ${
            pathname === "/my-registrations"
              ? "text-blue-700 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-blue-900"
          }`}
        >
          My Registrations
        </Link>
      </div>

      {/* Desktop Auth */}
      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <>
            <span className="font-label text-sm font-semibold text-on-surface-variant">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="font-label uppercase tracking-widest text-[11px] font-bold text-slate-600 hover:text-blue-900 transition-opacity"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="bg-primary text-white font-label uppercase tracking-widest text-[11px] font-bold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Sign In
          </Link>
        )}
      </div>

      {/* Mobile Hamburger */}
      <button
        className="md:hidden p-2 text-slate-600"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {menuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 mx-4 p-6 glass-panel rounded-3xl flex flex-col gap-4 md:hidden shadow-xl">
          <Link
            href="/events"
            className="font-label uppercase tracking-widest text-[11px] font-bold text-blue-700"
            onClick={() => setMenuOpen(false)}
          >
            Events
          </Link>
          {user && (
            <Link
              href="/my-registrations"
              className="font-label uppercase tracking-widest text-[11px] font-bold text-slate-600"
              onClick={() => setMenuOpen(false)}
            >
              My Registrations
            </Link>
          )}
          <hr className="border-outline-variant/20" />
          {user ? (
            <>
              <span className="font-label text-sm font-semibold text-on-surface-variant">
                {user.name}
              </span>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="font-label uppercase tracking-widest text-[11px] font-bold text-slate-600"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-primary text-white font-label uppercase tracking-widest text-[11px] font-bold px-6 py-2.5 rounded-full text-center hover:opacity-90 transition-all"
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
