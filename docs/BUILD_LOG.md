# Build Log

---

## Phase 0 — Project Setup & Architecture Design
**Date**: 2026-04-08 | **Tool**: Claude Code

**Approach**
Started with a top-down architecture design before writing any code. Chose a Next.js monorepo (frontend + API routes in one project) with Prisma ORM using a schema-first workflow — define data models once, derive everything else from them.

**Issues encountered and how I resolved them**

| Issue | Resolution | Why |
|-------|-----------|-----|
| Node.js 20.5 too old (Prisma requires ≥20.19) | Downloaded Node 22 LTS binary directly from nodejs.org | Homebrew and nvm both failed due to missing Xcode CLI tools on this machine |
| `create-next-app` refused non-empty directory | Scaffolded to `/tmp`, then rsync'd into project folder | Pre-created `CLAUDE.md` and `Dockerfile` before running scaffold |
| `npm install prisma` installed Prisma 7 with breaking changes | Downgraded to Prisma 5 | Prisma 7 moved connection config to a new file format; AI tools have much less training data on v7, increasing risk of generated code errors |

**Key decisions**
- **Monorepo over separate frontend/backend**: one Docker service to deploy, and the AI can see the full data flow in one context window
- **Prisma 5 over Prisma 7**: in AI-assisted development, the AI's fluency with a library matters more than using the latest version
- **`output: "standalone"` in next.config.ts**: required for Docker multi-stage build; without it the image includes all node_modules and becomes several GB

---

## Product Requirements — Use Case & Feature Definition
**Date**: 2026-04-08 | **Tool**: Claude Code (5 parallel agents)

**Approach**
Ran 5 specialist agents in parallel (PM, GovTech compliance, technical, UX/demo, product strategy) to critique and expand the initial feature list.

**Key decisions**

| Decision | Reasoning |
|----------|-----------|
| Dropped Luma integration | Luma API requires Plus ($59/mo); government agencies cannot use foreign SaaS for sensitive data — contradicts the core value proposition |
| Core narrative: replace Google Forms | Agencies use Google Forms today — data on foreign servers, no eligibility control, no audit trail. This system fixes all three simultaneously |
| Added Stripe for paid events | Replaces Luma as the primary external integration; provides both outbound (create Checkout Session) and inbound (webhook) — better data flow story than Luma |
| Added blacklist system | Real operational need: repeat no-shows waste capacity; auto-trigger at threshold prevents manual overhead |
| Added NorthFlank Cron for reminders | T-48h reminder requires scheduled execution, not just event-driven; NorthFlank native cron avoids introducing a third-party scheduler |
| Registration cutoff time | Government events freeze registrations 24-48h before for logistics |
| CPD/training hours field | Agencies currently track this in spreadsheets; capturing it here completes the government-grade story |
| Removed bulk approve | Creates approval-without-review risk when eligibility rules exist |
| Prisma transaction for waitlist | Prevents race conditions on concurrent last-seat registrations — technical detail worth naming in walkthrough |

## Requirements Finalised — Feature Lock
**Date**: 2026-04-08 | **Tool**: Claude Code

Use case confirmed: **GovEvent — Internal Government Event & Workshop Registration System**

Final feature set locked. Key additions from initial draft:

| Addition | Rationale |
|----------|-----------|
| Stripe paid events | Real external integration with bidirectional data flow (outbound: create Checkout Session; inbound: Stripe webhook). Demo-able with test cards. |
| Blacklist system | Real operational need — repeat no-shows and payment failures waste limited capacity |
| NO_SHOW auto-marking | System marks APPROVED but unchecked-in registrants after event ends; feeds blacklist threshold |
| NorthFlank Cron for reminders | T-48h reminders require scheduled execution; NorthFlank native cron avoids a third-party scheduler |
| Registration cutoff time | Events must freeze registration before event for logistics (catering, passes) |
| CPD/training hours | Government agencies track this in spreadsheets today; capturing here completes government-grade story |
| Inline eligibility validation | Instant feedback on registration form (no page reload); order: blacklist → eligibility → deadline → capacity |

Core entities confirmed: `Event`, `Registration`, `Blacklist`, `AuditLog`, `User`

Full requirements in `docs/REQUIREMENTS.md`.

---

## Phase 1 — Data Modeling
**Date**: 2026-04-08 | **Tool**: Claude Code (executing-plans)

**Approach**: Schema-first development. Defined the full Prisma schema with 5 models (User, Event, Registration, Blacklist, AuditLog) + 3 enums, then pushed to PostgreSQL (Docker) and generated the Prisma client. Seed data created with realistic Singapore government names, 3 events (free + paid + waitlist demo), 9 registrations, and 1 blacklist entry.

**Key decisions**

| Decision | Reasoning |
|----------|-----------|
| `@@unique([eventId, email])` on Registration | Prevents duplicate registrations at DB level, not just application level |
| `allowedDomains: String[]` as array on Event | Supports multi-domain eligibility (e.g., govtech.gov.sg + tech.gov.sg) without a join table |
| `noShowProcessed` flag on Event | Idempotent guard for cron job — prevents double NO_SHOW marking if job runs twice |
| `reminderSent` flag on Registration | Prevents duplicate T-48h reminder emails when cron fires hourly |

---

## Phase 2 — Backend API
**Date**: 2026-04-08 | **Tool**: Claude Code (executing-plans)

**Approach**: All 14 API routes built in one pass, grouped by domain. Services layer (email, Stripe, QR, waitlist, blacklist) extracted before routes to avoid circular dependencies. Session auth via `iron-session`.

**Key decisions**

| Decision | Reasoning |
|----------|-----------|
| `db.$transaction()` for registration submit | Prevents two users simultaneously claiming the last seat — capacity check and record creation are atomic |
| Email errors don't roll back state | Email is best-effort; registration status is source of truth. Avoids broken UX if Resend has an outage |
| `stripeSessionId` stores the Checkout URL | Not the session ID — makes it easy to show participants the payment link without a Stripe API round-trip |
| Cron endpoints protected by `x-cron-secret` header | NorthFlank Cron jobs send this header; anyone who knows the URL without the secret gets 403 |
| `promoteWaitlist()` called after any REJECTED/CANCELLED | Single function handles the state transition + renumbering + email — called from both the approve/reject route and the payment-timeout cron |

---

## Phase 3 — Frontend
**Date**: 2026-04-08 | **Tool**: Claude Code (executing-plans)

**Approach**: Server Components for all read paths (event listing, event detail, admin dashboard, audit log). Client Components only for interactive islands (registration form, approval actions, QR scanner, blacklist management). This matches Next.js 15 best practice and avoids unnecessary hydration.

**Key decisions**

| Decision | Reasoning |
|----------|-----------|
| `'use client'` only for interactive islands | Server renders HTML with data already embedded — no client-side fetch waterfall for initial page loads |
| `/my-registrations` as client with email lookup | No login required for participants; lookup by email matches government event context (anonymous access, self-service) |
| QR code generated on client (`qrcode` lib) | Avoids a server round-trip for each QR display; the registration ID is already in the response |
| `@zxing/browser` for camera scanning | Runs entirely in browser with no server dependency; works with any camera device |
| Manual check-in fallback in scanner | If camera fails (permissions denied, bad lighting), organiser can type registration ID — critical for event-day reliability |
| `BrowserQRCodeReader.releaseAllStreams()` in cleanup | Prevents camera resource leak on component unmount |

**Build verification**: `npm run build` passes with 0 TypeScript errors. 28 routes compiled.

---

## Phase 4 — Integration
**Date**: 2026-04-08 | **Tool**: Claude Code

Resend and Stripe keys added. Stripe CLI running locally for webhook forwarding.

| Service | Status | Key detail |
|---------|--------|------------|
| Resend | ✅ Verified — test email delivered | Using `onboarding@resend.dev` as FROM (no domain verification needed) |
| Stripe | ✅ Key configured | Test mode `sk_test_51T...` |
| Stripe Webhook (local) | ✅ CLI listener active | `whsec_c68f...` forwarding to `localhost:3000/api/webhook/stripe` |
| Stripe Webhook (prod) | ⏳ Pending NorthFlank URL | Will register via Stripe API after deploy |

**Issue found**: `/admin/login` was inside the admin layout which checked session → infinite redirect loop. Fixed by moving protected pages into `app/admin/(protected)/` route group, leaving login outside auth guard.

---

## v1.0-mvp Tag — Gap Assessment
**Date**: 2026-04-08

Git tag `v1.0-mvp` created. Full gap analysis conducted across all pages, API routes, and components. See `docs/V1_STATUS.md` for the complete breakdown.

**Summary**: All core data flows work end-to-end. The main gaps are UX completeness — missing event editing, no admin action feedback, no confirmation dialogs, and several flows that exist in the API but have no UI surface (publish/cancel events).

---

## Phase 5 — v2.0 Design Spec
**Date**: 2026-04-08 | **Tool**: Claude Code (brainstorming)

Conducted full gap analysis across all pages and user journeys. Ran brainstorming session to identify and confirm all v2.0 improvements. Spec written to `docs/superpowers/specs/2026-04-08-govent-v2-design.md`.

**16 feature blocks confirmed:**

| Block / Feature | Description |
|----------------|-------------|
| Block 1 | Event edit form + publish/unpublish/cancel buttons |
| Block 2 | Payment visibility in My Registrations |
| Block 3 | Global toast system + auto-refresh + table UX |
| Block 4 | Confirmation dialogs on destructive actions |
| Block 5 | Check-in camera error handling + name/email search + Enter key |
| Block 6 | Audit log filtering + pagination + human timestamps |
| Block 7 | Registration form UX (success CTA, real-time eligibility, deadline) |
| Block 8 | CSV export, self-cancel, print QR, bulk approve |
| Block 9 | Venue hiding — revealed only to APPROVED registrants |
| Feature A | CPD hours accumulation dashboard (participant-facing) |
| Feature B | Admin internal notes on registrations |
| Feature C | Event broadcast notification (admin → attendees) |
| Feature D | Registration deadline countdown |
| Feature E | Capacity progress bar |
| Feature F | QR code time-window validation (±2h from event) |
| Feature H | Check-in real-time stats panel |
| Feature I | Admin analytics dashboard with Recharts visualizations |
| Feature J | Full UI overhaul — government design system, mobile-responsive public pages |

**Key decisions made:**
- Venue hiding adds `venueHidden` boolean to Event schema — government security use case
- Admin notes adds `adminNotes` to Registration schema — operational need
- Analytics uses Recharts (React-native, no server dependency) — consistent with client-component approach
- UI overhaul scoped to shadcn/ui primitives only — no new UI library introduced

---

## v2.0 Block 1 — Event Edit Form + Publish/Unpublish/Cancel Buttons
**Date**: 2026-04-08 | **Tool**: Claude Code

**What was built**

| File | Change |
|------|--------|
| `components/features/admin/EventActionButtons.tsx` | New client component — Publish, Unpublish, Cancel Event buttons each wrapped in AlertDialog confirmation modals; calls `PATCH /api/events/[id]` with `{ action }` |
| `components/features/admin/EventEditForm.tsx` | New client component — collapsible `<details>` form to edit all event fields inline; calls `PATCH /api/events/[id]` with updated fields; disabled when event is cancelled |
| `app/admin/(protected)/events/[id]/page.tsx` | Replaced stub page — now shows status badge, integrates both new components, and passes serialized event data to `EventEditForm` |

**Issue encountered and resolved**

| Issue | Resolution |
|-------|-----------|
| `AlertDialogTrigger` does not accept `asChild` prop — project uses `@base-ui/react`, not `@radix-ui/react` | Removed `asChild` and applied Tailwind classes directly on `AlertDialogTrigger` (which renders a `<button>` natively and accepts `className`/`disabled` via `NativeButtonProps`) |

**Result**: `npx tsc --noEmit` — 0 errors. Committed as `feat: add event edit form and publish/unpublish/cancel action buttons`.

---

## v2.0 Block 3b — RejectModal, RegistrationRow toast feedback, RegistrationsPage search + status counts
**Date**: 2026-04-08 | **Tool**: Claude Code

**What changed**
- Created `components/features/admin/RejectModal.tsx` — shadcn Dialog with required reason textarea; blocks close while loading; clears reason on cancel
- Replaced `components/features/admin/RegistrationRow.tsx` — wired `toast.success` / `toast.error` from sonner; uses RejectModal instead of inline inline input; adds `disabled` on all buttons while loading
- Replaced `app/admin/(protected)/events/[id]/registrations/page.tsx` — loads all registrations once, filters/searches client-side; status filter tabs show live counts; added `PENDING_PAYMENT` to status list; search by name or email

**Result**: `npx tsc --noEmit` — 0 errors. Committed as `feat: RejectModal, toast feedback in RegistrationRow, search + status counts in registrations page`.

---

## v2.0 Block 6 — Audit log: filter by action/event, pagination, human timestamps
**Date**: 2026-04-08 | **Tool**: Claude Code

**What changed**

| File | Change |
|------|--------|
| `lib/utils.ts` | Appended `formatRelativeTime(iso)` — converts ISO timestamp to human-friendly relative strings ("just now", "5m ago", "3h ago", "2d ago") with fallback to `en-SG` locale date for entries older than 7 days |
| `components/features/admin/AuditTimeline.tsx` | Updated to use `formatRelativeTime`; added empty-state message; full ISO timestamp preserved in `title` attribute on hover |
| `components/features/admin/AuditLogFilters.tsx` | New `'use client'` component — two `<select>` dropdowns to filter by action type and event; "Clear filters" button; updates URL search params via `useRouter` |
| `app/admin/(protected)/audit-log/page.tsx` | Replaced stub — now async with `searchParams: Promise<{...}>` (Next.js 15 pattern); DB queries for logs, count, events, distinct actions run in parallel via `Promise.all`; pagination at 50 per page with Previous/Next links; `AuditLogFilters` wrapped in `<Suspense>` |

**Result**: `npm run build` — 0 errors, 0 TypeScript errors. `/admin/audit-log` compiled at 639 B. Committed as `feat: audit log — filter by action/event, pagination, human timestamps`.

---

## v2.1 Polish — Audit log redesign, event detail tabs, inline editing, fixes
**Date**: 2026-04-08 | **Tool**: Claude Code

**What changed**

| Area | Change |
|------|--------|
| Audit log redesign | Replaced timeline-axis layout with card-based list grouped by date (Today/Yesterday/date). Each entry shows color-coded action badge, event title, metadata summary, relative timestamp, and actor name. Added time-period filter (Today / Last 7 Days / Last 30 Days / All Time). |
| Event detail — tab layout | Replaced single-scroll page with 3-tab layout: Overview / Registrations (with count badge) / Check-in. All event management in one page, no more jumping between routes. |
| Event detail — inline editing | Replaced collapsible `<details>` edit form with inline-editable fields. Click any field to edit in-place; Enter saves, Esc cancels. Hover shows "Click to edit" hint. |
| Logout | Fixed `/api/auth/logout` — was returning JSON, now redirects to `/admin/login` after destroying session. |
| API error handling | Added try-catch on `PATCH /api/events/[id]` general update — Prisma `P2025` (record not found) now returns 404 JSON instead of empty 500. |
| Defensive JSON parsing | `EventEditForm` and `BlacklistTable` now use `res.text()` + manual `JSON.parse` instead of `res.json()` — prevents crash on empty response body. |
| Seed data | Admin name changed to Phoenix Chen. Blacklist threshold changed from 2 to 5 no-shows. |

**Issues encountered and resolved**

| Issue | Resolution |
|-------|-----------|
| `res.json()` crash on empty body after reseed | Session invalidated by reseed caused 500 with empty body. Fixed: read as `res.text()` first, parse manually with try-catch |
| Stale `.next` cache causing "Cannot find module" errors | `npm run build` then `npm run dev` left incompatible turbopack chunks. Fixed: `rm -rf .next` |
| Hydration mismatch warning on `<body>` | Caused by Grammarly browser extension injecting `data-gr-*` attributes — not a code bug |

**Key decisions**

| Decision | Reasoning |
|----------|-----------|
| Tab layout over separate pages | Admin managing an event needs overview, registrations, and check-in in context — switching between pages loses flow |
| Inline edit over form | Click-to-edit is faster for single-field changes (the common case); a full form is overkill when you just want to change the title or capacity |
| Card list over timeline for audit log | Timeline axis implies sequential dependency between events; audit log entries are independent items that should be scannable individually |
| 5 no-shows threshold over 2 | 2 is too aggressive — a single bad week could blacklist someone; 5 is a clearer pattern of repeated no-shows |

**Result**: `npx tsc --noEmit` — 0 errors. All pages returning 200.

---

## Phase 6 — Deployment
**Date**: _TBD_ | **Tool**: _TBD_

---

## What I Would Do Differently
_To be filled before submission._
