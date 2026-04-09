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

## Phase 5.1 — Schema: venueHidden field (Task 1 of v2.2)
**Date**: 2026-04-08 | **Tool**: Claude Code

**What changed**
- Added `venueHidden Boolean @default(false)` to `Event` model in `prisma/schema.prisma`, positioned after `venue`
- Set `venueHidden: true` on the seed event "Q2 All-Hands Townhall" to demonstrate the feature
- Ran `prisma db push` (263ms, 0 migrations needed — column added directly), `prisma generate`, and `prisma db seed`
- `npx tsc --noEmit` — 0 errors

**Key decisions**

| Decision | Reasoning |
|----------|-----------|
| `@default(false)` | All existing and future events show venue by default; hiding is opt-in, matching principle of least surprise |
| Seed event 1 as demo | The All-Hands Townhall is the most prominent seed event and a realistic use case (large venue, staff only — hiding until approved reduces speculative attendance) |

---

## Phase 5.1 — AdminSidebar UI Redesign
**Date**: 2026-04-08 | **Tool**: Claude Code

**What changed**
Rewrote `components/layout/AdminSidebar.tsx` with lucide-react icons and a consistent government color system.

**Changes made**
- Logo area: Shield icon + bold "GovEvent" text + "Admin Portal" subtitle in gray-400
- Nav links updated with lucide-react icons: LayoutDashboard (Dashboard), Calendar (Events), Shield (Blacklist), FileText (Audit Log)
- Active state: `bg-blue-600/20 text-white border-l-2 border-blue-400` (left accent border)
- Inactive state: `text-gray-400 hover:text-white hover:bg-white/5`
- Sign out: POST form with LogOut icon, consistent hover styling
- Sidebar background changed from `bg-gray-900` to `bg-slate-900`
- Exact path match for Dashboard (`/admin`), `startsWith` for all other routes

**Verification**
`npx tsc --noEmit` — 0 errors.

---

## v2.2 — CapacityBar reusable component
**Date**: 2026-04-08 | **Tool**: Claude Code

**What changed**
- Created `components/features/CapacityBar.tsx` — pure server component, no client directive needed
- Props: `registered`, `capacity`, `showLabel` (default `true`)
- Fill colour thresholds: green < 70 %, amber 70–90 %, red > 90 %
- When `registered >= capacity`: bar shows 100 % fill, label reads "Full — Waitlist open"
- Minimum visible sliver (`min-w-[8px]`) when at least one person is registered
- `npx tsc --noEmit` — 0 errors

---

## v2.2 — Legacy file cleanup
**Date**: 2026-04-08 | **Tool**: Claude Code

**What changed**
- Deleted `components/features/admin/AuditTimeline.tsx` — superseded by `AuditLogList.tsx`; no imports found anywhere in source code
- Deleted `app/admin/(protected)/events/[id]/registrations/page.tsx` — standalone registrations page superseded by the Registrations tab in the event detail page (`RegistrationsPanel`); no links to this route found in source code
- Converted `app/admin/(protected)/checkin/[id]/page.tsx` to a redirect to `/admin/events/[id]?tab=checkin` — the admin events table still links to `/admin/checkin/:id`, so the route is kept alive but now bounces to the embedded Check-in tab

---

## v2.2 — Admin Events List Polish
**Date**: 2026-04-08 | **Tool**: Claude Code

**Changes**
- Rewrote `app/admin/(protected)/events/page.tsx` (server component, no new dependencies)
- Title column is now a Next.js `<Link>` to `/admin/events/[id]` (blue-600, hover:underline, font-medium)
- Date column upgraded to date + time via `toLocaleString('en-SG', {...})` — e.g. "8 Apr 2026, 2:00 PM"
- Added Capacity column showing "X / Y"; color-coded green (<70%), amber (70–90%), red (>90%) using inline `capacityColor` helper
- Status badge: Draft now uses `bg-yellow-100 text-yellow-700` (was gray) for better visual hierarchy
- Removed separate "Manage" and "Check-in" text links — Actions column removed entirely
- Added empty-state: centered "No events yet." + "Create your first event →" link when table is empty
- `npx tsc --noEmit` — 0 errors

---

## v2.2 — Loading Skeletons (Next.js App Router)
**Date**: 2026-04-08 | **Tool**: Claude Code

**What was done**
Added `loading.tsx` files to 4 route directories so Next.js App Router shows instant skeleton UIs while async page data fetches:

| File | Skeleton content |
|------|-----------------|
| `app/(public)/events/loading.tsx` | h1 skeleton + 3 EventCard-shaped skeletons (title/price row, date, venue, capacity/link row) |
| `app/(public)/events/[id]/loading.tsx` | back-link skeleton + title + 6-row info grid + 3-line description block + CTA button |
| `app/admin/(protected)/events/loading.tsx` | header row (title + New Event button) + table header + 5 skeleton rows × 5 columns |
| `app/admin/(protected)/audit-log/loading.tsx` | title + entry count + 3-dropdown filter row + 5 card-row skeletons (badge, actor/event text, timestamp) |

**Pattern**: `animate-pulse` wrapper with `bg-gray-200 rounded` placeholder `div`s sized to match real content dimensions.

- `npx tsc --noEmit` — 0 errors

---

## v2.2 — Event Detail Page Redesign + DeadlineCountdown
**Date**: 2026-04-08 | **Tool**: Claude Code

**What was done**
Redesigned the public event detail page and added a live deadline countdown component:

| File | Change |
|------|--------|
| `components/features/DeadlineCountdown.tsx` | New client component — counts down to `registrationDeadline`; shows Xd Xh Xm (gray) > 24h, Xh Xm (amber) < 24h, or "Registration closed" (red) |
| `app/(public)/events/[id]/page.tsx` | Full rewrite: title + FREE/PAID/Published badges, info card with Date & Time / Venue (hidden if `venueHidden`) / CapacityBar / CPD Hours / Price / Eligibility rows, DeadlineCountdown, description, smart CTA (Register Now / Join Waitlist / hidden if closed or cancelled) |

**Key decisions**
- `venueHidden` field drives venue display — shows italic "Venue will be revealed upon approval" for hidden events
- Registration count query uses `PENDING | APPROVED | PENDING_PAYMENT` statuses for accurate capacity calc
- CTA logic: past deadline → hidden; full → "Join Waitlist →"; else → "Register Now →"
- `DeadlineCountdown` uses `setInterval` + cleanup on unmount; receives ISO string prop from server component

- `npx tsc --noEmit` — 0 errors

---

## v2.2 — EventCard Redesign with CapacityBar + Venue Hiding
**Date**: 2026-04-08 | **Tool**: Claude Code

**What was done**
Rewrote `components/features/EventCard.tsx` as a polished Server Component:

| File | Change |
|------|--------|
| `components/features/EventCard.tsx` | Full rewrite: `rounded-xl` card, title + FREE/SGD badge row, formatted date, conditional venue display, CapacityBar, domain restriction notice, full-card Link wrapper with "View Details →" button |
| `app/(public)/events/page.tsx` | Added `venueHidden={e.venueHidden}` prop pass-through |

**Key decisions**
- FREE badge: `bg-green-100 text-green-700`; paid badge: `bg-blue-100 text-blue-700`
- `venueHidden` → italic `text-gray-400` placeholder; otherwise plain venue text
- Entire card wrapped in `<Link>` for full-surface click area
- Removed emoji icons (📅 📍) in favour of clean text layout
- `npx tsc --noEmit` — 0 new errors

---

## v2.2 — Registration Form: Eligibility Preview + Success CTA
**Date**: 2026-04-08 | **Tool**: Claude Code

**What was done**
Improved the public registration form with two UX enhancements:

**Eligibility preview (real-time, no API call)**
- RegistrationForm now accepts allowedDomains and isPaid props
- After the email input, a hint line appears once the typed email contains @
- Domain extracted and compared (case-insensitive) against allowedDomains
- If allowedDomains is empty: no hint shown
- Eligible domain → green text "✓ Eligible"
- Ineligible domain → amber text "⚠ This domain may not be eligible"

**Success screen**
Replaced the minimal success state with a proper card:
- Large green ✓ + "Registration Submitted!" title
- StatusBadge showing the returned status
- "What happens next" gray card with contextual copy:
  - WAITLISTED: position number from waitlistPosition field
  - Paid event: payment link notice
  - Free/pending: approval email notice
- Primary CTA: "View My Registrations →" (blue button, /my-registrations)
- Secondary link: "Register for another event →" (/events)

**Files changed**
- app/(public)/register/[id]/page.tsx — passes allowedDomains and isPaid to form
- components/features/RegistrationForm.tsx — eligibility hint + success card

- `npx tsc --noEmit` — 0 errors

## v2.2 — Mobile-Responsive Public Pages
**Date**: 2026-04-08 | **Tool**: Claude Code

**What was done**
Made all public-facing pages mobile-responsive.

**PublicNav redesign (`components/layout/PublicNav.tsx`)**
- Converted to `'use client'` to support useState-driven mobile menu toggle
- Desktop (md+): horizontal bar — Landmark icon + "GovEvent" logo left, "My Registrations" link right
- Mobile (below md): hamburger (Menu icon) shown on right; clicking opens a slide-down dropdown with "My Registrations" link; X icon closes it; clicking a link auto-closes the menu
- Nav height set to h-16 with proper vertical centering
- Bottom border + shadow: `border-b border-gray-200 shadow-sm`
- Logo: bold text-lg, text-slate-800, with `Landmark` icon in blue-700

**Public layout (`app/(public)/layout.tsx`)**
- Responsive horizontal padding: `px-4 sm:px-6 lg:px-8`
- Responsive vertical padding: `py-6 sm:py-8`
- Layout changed to `flex flex-col` with `flex-1` on main — footer pins to bottom
- Added a subtle footer: "© 2026 GovEvent · Internal Government Use Only"
- Background changed to `bg-slate-50`

**Existing public pages (no changes needed)**
- Event listing cards: already full-width on mobile (space-y-4 list, no grid)
- Registration form: already constrained with max-w-lg (works fine on small screens)

**Files changed**
- `components/layout/PublicNav.tsx` — mobile hamburger nav
- `app/(public)/layout.tsx` — responsive padding + footer

- `npx tsc --noEmit` — 0 errors in changed files (1 pre-existing error in unrelated admin file)

---

## v2.3 — Power Features
**Date**: 2026-04-08 | **Tool**: Claude Code (15 parallel agents)

**All features implemented, build verified: 0 TypeScript errors, 36 routes compiled.**

### New API Endpoints (6)
- `GET /api/analytics` — aggregated dashboard stats
- `POST /api/events/[id]/broadcast` — email broadcast to APPROVED/WAITLISTED
- `GET /api/events/[id]/checkin-stats` — live check-in progress for polling
- `GET /api/registrations/export` — CSV download of attendees
- `POST /api/registrations/bulk-approve` — batch approve PENDING registrations
- `POST /api/registrations/self-cancel` — participant self-cancel

### New Components (8)
- `AnalyticsDashboard.tsx` — Recharts: status pie, fill rates, org breakdown, upcoming schedule
- `BroadcastModal.tsx` — email subject + message modal
- `CheckInStatsPanel.tsx` — polling sidebar with progress bar + last 5 scans
- `CheckInSearch.tsx` — name/email lookup with one-click check-in
- `CsvExportButton.tsx` — CSV download button
- `BulkApproveBar.tsx` — floating selection bar with AlertDialog
- `AdminNotesField.tsx` — auto-saving textarea on blur
- `SelfCancelButton.tsx` — cancel link with confirm dialog

### Key Changes
- Analytics dashboard embedded directly in admin dashboard page
- Check-in scanner: tabbed layout (QR/Search/Manual), camera error handling, Enter key, live stats panel
- Registrations panel: toolbar with CSV export + bulk select
- QR check-in: ±2h time-window validation
- Schema: added `adminNotes String?` to Registration

---

## v2.4 — Participant Auth + UX Polish
**Date**: 2026-04-08 | **Tool**: Claude Code

### Participant Authentication
- **Participant model** in Prisma: email, passwordHash, name, isVerified, verificationCode, codeExpiresAt
- **Sign Up flow**: name + email + password → OTP via Resend → verify → session
- **Sign In flow**: email + password → iron-session (separate cookie `govent-participant`)
- **5 new API routes**: `/api/auth/participant/{signup,verify,login,logout,me}`
- **2 new pages**: `/signup` (two-step OTP), `/login` (with redirect support)
- **PublicNav**: auth-aware — Sign In/Sign Up for guests, Hi {name} + Sign Out for users
- **My Registrations**: requires login, auto-loads from session
- **Registration form**: pre-fills from session if logged in, email read-only

### Data Model Cleanup
- Renamed `department` → `organisation` across full stack (schema, 5 APIs, 9 components, seed)
- Renamed `allowedDepartments` → `allowedOrganisations` on Event model
- Removed `venueHidden` — always show venue, "To Be Confirmed" if empty
- Updated seed: realistic Singapore agencies (GovTech, IMDA, CSA), 7 events

### UX Improvements
- Event listing filters: search + time + cost + organisation
- Re-registration allowed after CANCELLED/REJECTED
- EventOverview: chip-based tags editor, checkbox auto-save
- Eligibility display: shows Organisation not domain

### Bug Fixes
- Stripe `expires_at` max 24h, Stripe URL fix
- API error handling: try/catch on PATCH routes with real error messages
- Check-in defaults to Search tab (no auto camera prompt)

---

## v2.5 — Security Fixes, Print QR, Docs Polish
**Date**: 2026-04-08 | **Tool**: Claude Code (16 verification agents)

### Security fixes
- `/api/my-registrations`: added session auth (was open to any email query)
- `/api/registrations/self-cancel`: verifies session email matches
- `EventRegistrationStatus`: uses session-based API

### New feature: Print QR Code
- QrDisplay: print button opens print-friendly window with event title + QR + registration ID

### Documentation
- DATA_FLOW.md: added 12 missing API routes
- ARCHITECTURE.md: fixed page types, added missing pages

**Build**: 0 TypeScript errors, 36 routes compiled.

---

## v3.1 — Critical Fixes (Tier 1)
**Date**: 2026-04-08 | **Tool**: Claude Code (5 brainstorming agents + direct fixes)

### Process
Dispatched 5 specialist agents (UX/Demo reviewer, Backend architect, GovTech assessor, Admin workflow reviewer, Participant journey reviewer) to identify design gaps. Consolidated findings into 3 priority tiers, then fixed all Tier 1 (critical) items.

### Changes

| File | Change |
|------|--------|
| `app/api/auth/participant/reset-password/route.ts` | **New**: Password reset API — two-step flow: `send-code` (generates 6-digit OTP, sends via Resend) and `reset` (validates OTP, updates passwordHash). Same 10-min expiry as signup. |
| `app/(public)/forgot-password/page.tsx` | **New**: Forgot password page — step 1: enter email, step 2: enter OTP + new password + confirm. Redirects to login on success. |
| `app/(public)/login/page.tsx` | Added "Forgot password?" link below login form |
| `app/api/events/route.ts` | **Event date validation**: POST rejects `endTime <= startTime`, `registrationDeadline >= startTime`, `capacity <= 0`, paid events with no price |
| `app/api/events/[id]/route.ts` | **Event edit validation**: PATCH validates date consistency when time fields are updated |
| `app/api/registrations/[id]/route.ts` | **Approve guard**: blocks approval of registrations on cancelled events |
| `app/api/registrations/route.ts` | **Zod validation**: registration POST now uses Zod schema for input validation (email format, string lengths) |
| `components/features/SelfCancelButton.tsx` | Replaced `window.confirm()` with shadcn `AlertDialog` — consistent with admin destructive actions |

**Build**: 0 TypeScript errors, 37 routes compiled.

---

## v3.2 — Data Integrity, UX Polish, Documentation (Tier 2+3)
**Date**: 2026-04-08 | **Tool**: Claude Code (16 verification agents)

### Changes

| File | Change |
|------|--------|
| `app/api/webhook/stripe/route.ts` | Stripe webhook checks `event.isCancelled` before approving — prevents orphaned approvals on cancelled events |
| `services/waitlist.ts` | Entire `promoteWaitlist` wrapped in `db.$transaction` — fixes race condition on concurrent rejections |
| `services/blacklist.ts` | Auto-blacklist activation now logs `AUTO_BLACKLIST_ACTIVATED` to audit trail |
| `app/api/registrations/bulk-approve/route.ts` | Returns `pendingPayment` count in response |
| `components/features/admin/BulkApproveBar.tsx` | Toast now shows "Approved: X · Awaiting payment: Y" for paid events |
| `app/(public)/signup/page.tsx` | Added OTP countdown timer (mm:ss format, "Code expired" state, resets on resend) |
| `app/(public)/my-registrations/page.tsx` | Shows payment deadline date/time for PENDING_PAYMENT registrations |
| `app/api/events/[id]/route.ts` | PATCH validates capacity > 0 when editing |
| `docs/ARCHITECTURE.md` | Added "Scalability Considerations" table (7 dimensions) and "Failure Modes" table (6 scenarios) |
| `docs/DATA_FLOW.md` | Added reset-password route to API summary table |

**Build**: 0 TypeScript errors, 37 routes compiled.

---

## v3.3 — Tags, Permissions, Dashboard & UX Refinements
**Date**: 2026-04-08 | **Tool**: Claude Code

### Event Tags
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `tags String[]` to Event, `creatorId String?` + `creator` relation, `isSuperAdmin Boolean` to User |
| `app/api/events/route.ts` | POST saves `tags` and `creatorId` from session |
| `app/api/events/[id]/route.ts` | PATCH supports `tags` field update |
| `components/features/EventCard.tsx` | Displays coloured tag pills (AI=purple, Cloud=sky, Cybersecurity=red, etc.) |
| `components/features/EventFilters.tsx` | Topic + Organisation changed from pill list to dropdown multi-select with checkboxes, "All Topics" / "Open To: All" defaults |
| `components/features/admin/EventForm.tsx` | Tag picker with 8 presets (click to toggle), multi-select |
| `components/features/admin/EventOverview.tsx` | Added Tags row to inline editor |

### Event Permissions
| File | Change |
|------|--------|
| `prisma/schema.prisma` | `Event.creatorId` → User relation, `User.isSuperAdmin` flag |
| `lib/auth.ts` | Session includes `isSuperAdmin` |
| `app/api/auth/login/route.ts` | Sets `isSuperAdmin` in session on login |
| `app/admin/(protected)/events/page.tsx` | Super admin sees all events + "Created By" column; regular admin sees only own events |
| `prisma/seed.ts` | 3 admin accounts (Phoenix=super, Sarah, Rajan), events split across creators, diverse audit logs |

### Dashboard & UX
| File | Change |
|------|--------|
| `components/features/admin/AnalyticsDashboard.tsx` | Removed Event Fill Rates (redundant with Upcoming Schedule), added Popular Topics (Top 5 ranked bars), Upcoming Schedule now full-width grid |
| `app/admin/(protected)/page.tsx` | Stat cards changed to pure display (removed click-through links) |
| `components/features/CapacityBar.tsx` | Public mode shows "Seats Available" / "Waitlist Open" (no numbers); admin mode unchanged |
| `components/features/EventCard.tsx` | Removed "View Details →" text (hover effect sufficient) |
| `app/admin/login/page.tsx` | Removed hardcoded credentials, fixed redirect flash (router.push → window.location.href) |

**Build**: 0 TypeScript errors, 45 routes compiled.

---

## v3.4 — QR Scanner, Sidebar, Filter & Capacity UX
**Date**: 2026-04-08 | **Tool**: Claude Code

### Changes

| File | Change |
|------|--------|
| `components/features/admin/CheckinScanner.tsx` | QR Scanner no longer auto-requests camera on tab load. Shows "Start Camera" button; camera starts only on click. useEffect waits for video element mount before initialising. Camera released on tab switch. |
| `components/layout/AdminSidebar.tsx` | Changed `min-h-screen` to `h-screen sticky top-0` — Sign out button always visible at bottom without scrolling |
| `components/features/EventFilters.tsx` | Organisation filter label changed from "All Organisations" to "Open To: All" for clarity |
| `components/features/CapacityBar.tsx` | Public mode shows "Seats Available" / "Waitlist Open" status text only (no numbers/progress bar). Admin mode unchanged. |
| `components/features/EventCard.tsx` | Removed "View Details →" text — card hover effect is sufficient interaction hint |
| `app/admin/login/page.tsx` | Removed hardcoded demo credentials, fixed login redirect flash |

**Build**: 0 TypeScript errors, 45 routes compiled.

---

## v3.5 — Organisation Auto-fill
**Date**: 2026-04-08 | **Tool**: Claude Code

### Changes

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `organisation String?` to Participant model |
| `app/(public)/signup/page.tsx` | Added Organisation input field to signup form, sent to API |
| `app/api/auth/participant/signup/route.ts` | Saves organisation to Participant on account creation |
| `app/api/auth/participant/me/route.ts` | Returns organisation from DB (not just session) |
| `components/features/RegistrationForm.tsx` | Pre-fills organisation from participant profile |
| `app/api/registrations/route.ts` | Saves organisation back to participant profile on registration submit |

**Build**: 0 TypeScript errors, 45 routes compiled.

---

## v3.6 — Event Cover Images
**Date**: 2026-04-08 | **Tool**: Claude Code (16 verification agents)

### Changes

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `imageUrl String?` to Event model |
| `next.config.ts` | Added `images.unsplash.com` to remotePatterns for Next.js Image |
| `components/features/EventCard.tsx` | Renders cover image (Next.js Image, h-40, object-cover) when imageUrl present |
| `components/features/EventFilters.tsx` | EventData interface + EventCard prop includes imageUrl |
| `app/(public)/events/page.tsx` | Serializes imageUrl in event data |
| `app/api/events/route.ts` | POST saves imageUrl |
| `app/api/events/[id]/route.ts` | PATCH handles imageUrl updates |
| `components/features/admin/EventForm.tsx` | "Cover Image URL" input field for event creation |
| `components/features/admin/EventOverview.tsx` | imageUrl in interface + FIELDS for inline editing |
| `app/admin/(protected)/events/[id]/page.tsx` | Passes imageUrl to EventOverview |
| `prisma/seed.ts` | 7 Unsplash images matched to event topics (conference, server, whiteboard, security, AI, community, teamwork) |

**Verification**: 16 agents confirmed all components pass. Build: 0 errors, 45 routes.

---

## Phase 6 — Deployment
**Date**: _TBD_ | **Target**: NorthFlank

- Docker multi-stage build (`output: "standalone"` in next.config.ts)
- NorthFlank managed PostgreSQL
- NorthFlank Cron Job (hourly) for `/api/cron/*` endpoints
- Stripe webhook production endpoint registration
- Environment variables via NorthFlank secrets

---

## What I Would Do Differently

| Area | What I'd change | Why |
|------|-----------------|-----|
| Auth | Use Singpass/Corppass instead of email+password | Government identity verification is stronger than email OTP |
| Validation | Add Zod schema validation on all API inputs | Currently trusting client input shape; Zod catches malformed data at boundary |
| Email | Move to background queue (BullMQ or similar) | Email sending blocks the API response; queue decouples latency |
| Rate limiting | Add rate limits on auth + registration endpoints | Prevent brute-force and abuse |
| Real-time | WebSocket for check-in stats and seat updates | Current polling creates unnecessary load; WebSocket gives instant feedback |
| Testing | Add integration tests for critical flows | Registration + approval + payment is the core flow; needs automated validation |
| Error monitoring | Add Sentry or equivalent | Currently logging to console; production needs alerting |
| Approval workflow | Multi-level approval (registrant → manager → coordinator) | Some government events require hierarchical sign-off |
| Accessibility | WCAG 2.1 AA audit | Government services must be accessible; current UI hasn't been audited |

---

## v4.0 — Security Audit, Admin Accounts & UX Fixes
**Date**: 2026-04-09 | **Tool**: Claude Code (8 parallel audit agents + 6 parallel fix agents)

**Approach**
Dispatched 8 specialised agents to audit the entire codebase in parallel: public pages, registration flow, admin management, payment/check-in/cron, accounts/blacklist/audit, my-registrations/email, API security, and layout/routing. Identified 17 bugs across security, state machine, and UX. Then dispatched 6 fix agents in parallel to resolve all issues.

### New Features

| Feature | Files | Description |
|---------|-------|-------------|
| Admin Accounts page | `app/admin/(protected)/accounts/page.tsx`, `components/features/admin/AccountsPanel.tsx`, `app/api/admin/accounts/route.ts` | Super Admin can view all admin accounts, create new admins, reset passwords. Sidebar link visible only to Super Admin. |
| Admin cancel registration | `components/features/admin/RegistrationRow.tsx`, `app/api/registrations/[id]/route.ts` | Admin can cancel APPROVED, WAITLISTED, and PENDING_PAYMENT registrations. Waitlist auto-promotes on cancel. |
| Participant re-registration | `app/api/auth/participant/signup/route.ts` | Same email can re-register (updates credentials, re-sends OTP). Supports repeated demo of full signup flow. |

### Security Fixes (17 bugs)

| Bug | File | Fix |
|-----|------|-----|
| Event API missing ownership check | `app/api/events/[id]/route.ts` | PATCH verifies `creatorId === session.userId` or `isSuperAdmin` before edit/publish/cancel |
| Broadcast API missing ownership check | `app/api/events/[id]/broadcast/route.ts` | Added ownership check after fetching event |
| Registration export missing ownership | `app/api/registrations/export/route.ts` | Added ownership check before returning CSV data |
| Admin event detail page open to all admins | `app/admin/(protected)/events/[id]/page.tsx` | Added `requireAdmin()` + ownership check, non-owner gets 404 |
| Self-cancel auth bypass | `app/api/registrations/self-cancel/route.ts` | Requires login (401) + email match (403) |
| Open redirect on login | `app/(public)/login/page.tsx` | Validates redirect starts with `/`, rejects `//` |
| Stripe webhook not idempotent | `app/api/webhook/stripe/route.ts` | Skips processing if registration status is not `PENDING_PAYMENT` |
| Email case sensitivity | 5 auth API routes | All email inputs normalised with `toLowerCase().trim()` |
| Domain check case sensitivity | `app/api/registrations/route.ts` | Domain extracted with `.toLowerCase()` |
| Reject allows non-PENDING | `app/api/registrations/[id]/route.ts` | Added status check + cancelled event guard |
| Mark-paid allows non-PENDING_PAYMENT | `app/api/registrations/[id]/route.ts` | Added `PENDING_PAYMENT` status guard |
| Payment timeout increments no-show | `app/api/cron/payment-timeout/route.ts` | Removed `incrementNoShow()` — payment failure ≠ no-show |
| Email service crashes on Resend outage | `services/email.ts` | All 9 send functions wrapped in try-catch (best-effort) |

### UX Fixes

| Issue | File | Fix |
|-------|------|-----|
| Publish → Unpublish double dialog | `EventActionButtons.tsx` | Controlled `open` state; single AlertDialog with dynamic text |
| Published badge shown to participants | `events/[id]/page.tsx` | Removed — participants only see published events |
| Broadcast toast shows "0 recipients" | `BroadcastModal.tsx` | Changed `data.count` → `data.sent` |
| Password fields show plaintext | `AccountsPanel.tsx` | Changed `type="text"` → `type="password"` |
| CapacityBar division by zero | `CapacityBar.tsx` | Added `capacity === 0` guard |
| EventForm allows invalid dates | `EventForm.tsx` | Real-time validation: red border + warning text + submit disabled |
| EventForm missing min on capacity/price | `EventForm.tsx` | Added `min="1"` / `min="0.01"` + `required` |
| Organisation filter shows empty options | `EventFilters.tsx` | Tag/org dropdowns now derived from time-filtered events |
| Organisation filter includes "open to all" | `EventFilters.tsx` | Excluded `allowedOrganisations: []` events when filtering by specific org |
| Manual ID check-in tab useless | `CheckinScanner.tsx` | Removed — QR Scanner + Search is sufficient |
| Admin login no password recovery hint | `admin/login/page.tsx` | Added "Forgot password? Contact your system administrator." |

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| 8 parallel audit agents | Covers all layers (public, admin, API, security) simultaneously; each agent has focused scope for thorough analysis |
| Ownership check pattern: `creatorId === userId \|\| isSuperAdmin` | Consistent permission model: creators own their events, super admin overrides all |
| Email normalisation at API boundary | Single point of normalisation prevents case mismatch bugs across all downstream logic |
| Remove Manual ID tab | Registration IDs are cuid strings — no user would type these manually. QR + name search covers all real check-in scenarios |
| Real-time date validation over API-only | Prevents confusion where dates silently "correct" themselves; user sees the problem immediately |
| `try-catch` on email, not `throw` | Email is best-effort; registration is source of truth. Resend outage should not block user actions |

**Build**: 0 TypeScript errors, 46 routes compiled.

---

## v5.0 — Complete UI Rebuild: "The Ethereal State" Design System (2026-04-09)

### Overview
Deleted the entire v4.0 frontend (63 files) and rebuilt from scratch using a new design system called **"The Ethereal State" (Sovereign Prism)**. The rebuild was driven by visual reference mockups in `design_reference/` and guided by `docs/FRONTEND_SPEC.md` (logic spec) + `docs/DESIGN.md` (visual spec).

**Approach**: Template-first — extract Tailwind classes and structure from design reference HTML files, inject real data/logic. Parallel agent execution (5-7 agents per phase) for independent pages.

### Design System: The Ethereal State

| Element | Specification |
|---------|--------------|
| **Philosophy** | "The Sovereign Prism" — authority through clarity, depth, and light. Departure from bureaucratic aesthetic. |
| **Colors** | Material Design 3 token system: deep institutional blues (`primary` #00478d), ethereal accents (`tertiary-fixed` #a1efff, `secondary-fixed` #dee0ff) |
| **Typography** | Manrope (headlines, Extra Bold, tight tracking) + Inter (labels, small caps) via `next/font/google` |
| **Surfaces** | Tonal layering (frosted glass metaphor): `glass-panel` (82% white, 40px blur, saturate 1.6), `glass-card` (with box-shadow) |
| **Borders** | "No-Line Rule" — boundaries via tonal shifts and spacing, not opaque borders. Ghost borders at 20% opacity when needed |
| **Corners** | Public pages: `rounded-xl` for hero cards, `rounded-full` for nav/buttons. Admin pages: `rounded-md` (8px) for containers, `rounded` (6px) for inputs — professional, minimal |
| **Backgrounds** | Iridescent radial gradients + noise-overlay texture at 2% opacity |
| **Tailwind** | v4 with CSS-based `@theme` config (not `tailwind.config.js`), custom colors in `globals.css`, form reset in `@layer base` |

### Phase 1 — Public Core (5 parallel agents)

| Page | Route | Key Features |
|------|-------|-------------|
| **Events Listing** | `/events` | Server Component + ISR, hero featured event (admin-selected via `isFeatured`), secondary card, client-side filters (Time/Topic/Open To/Free Only as glass pills), search bar inline with filters |
| **Event Detail** | `/events/[id]` | 8:4 grid (hero + bento info cards + description / sticky sidebar), live countdown timer, registration status logic (registered/sign-in/register/waitlist/closed) |
| **Registration** | `/register/[id]` | Glass-panel form, real-time email eligibility check, pre-fill from session, success screen with status-aware messaging |
| **My Registrations** | `/my-registrations` | CPD hours summary, upcoming/past split, QR code (local `qrcode` lib), self-cancel with confirmation, status-specific card variants |

**Design decisions:**
- Hero layout: "极简平行" (Minimal Parallel) — title left, description right, bottom-aligned. Search + filter pills in single inline row.
- Capacity display: Public shows "Seats Available" / "Waitlist Open" (no exact numbers) — prevents gaming.
- QR generation: Switched from external `api.qrserver.com` to local `qrcode` npm package via dynamic import — no network dependency.

### Phase 2 — Authentication (4 parallel agents)

| Page | Route | Key Features |
|------|-------|-------------|
| **Participant Login** | `/login` | Left-right split glass-panel, form + decorative image with testimonial quote |
| **Signup** | `/signup` | Two-step flow (form → OTP), compact layout matching login proportions |
| **Forgot Password** | `/forgot-password` | Two-step flow (email → code + new password), same split layout |
| **Admin Login** | `/admin/login` | "Admin Console" variant with shield icon, "Authenticate Node" CTA, "System Integrity: Optimal" quote |

**Design decisions:**
- Auth pages in `(auth)` route group — no PublicNav (standalone full-screen layout)
- Signup compacted: title `text-3xl`, inputs `py-3 text-sm`, `space-y-3` — fits one screen
- Shared visual: iridescent-bg gradient + accent-spot glow effects + glass-panel container

### Phase 3 — Admin Dashboard (7 parallel agents + layout)

| Page | Route | Key Features |
|------|-------|-------------|
| **Layout + Sidebar** | `admin/(dashboard)/layout.tsx` | Server-side auth check, fixed sidebar w-64, active state via `usePathname()`, user avatar + role badge, Super Admin conditional nav items |
| **Dashboard** | `/admin` | 4 stat cards (parallel Prisma queries), analytics section: SVG donut chart (registration status), horizontal bar chart (popular topics), horizontally-scrollable upcoming schedule cards |
| **Events List** | `/admin/events` | Status tabs (All/Published/Draft/Cancelled), capacity bars, pagination, Super Admin sees all + creator column |
| **Create Event** | `/admin/events/new` | 4-section form (Basic/Schedule/Eligibility/Payment), tag pill toggles, real-time validation, **Save as Draft** + Create & Publish dual actions |
| **Event Detail** | `/admin/events/[id]` | 3-tab layout — Overview (inline edit, all fields in single card with border separators), Registrations (search/filter/bulk approve/CSV export/reject modal), Check-in (QR scanner via @zxing + search fallback + live stats polling) |
| **Blacklist** | `/admin/blacklist` | Search + source filter, incident bars, add/remove with confirmation dialogs |
| **Audit Log** | `/admin/audit-log` | Period/Action/Event filters, date-grouped entries, color-coded action badges, pagination |
| **Accounts** | `/admin/accounts` | Super Admin only, add admin dialog, reset password per-row |

**Design decisions:**
- Admin圆角分层: containers `rounded-md` (8px), inputs `rounded` (6px), modals `rounded-lg`, pills `rounded-full`
- Page titles unified: all `text-3xl font-extrabold` across admin pages
- Event edit: single white card container with `border-b` field separators (not individual cards per field)
- Tag colors: unified neutral gray `bg-surface-container-high` (no per-tag rainbow colors)
- Dashboard layout: Registration Status + Popular Topics side-by-side (row 1), Upcoming Schedule full-width horizontal scroll (row 2) — no forced equal-height stretching
- Analytics charts: hand-written SVG (donut) + div-based bars — no Recharts dependency

### Additional Features (3 parallel agents)

| Feature | Implementation |
|---------|---------------|
| **Featured Event** | `isFeatured Boolean` on Event schema. Admin toggle (★/☆) in event detail. Public `/events` prioritizes `isFeatured` over auto-nearest. |
| **CPD Hours Tracker** | Dynamic "For Your Career" section: static for guests, shows real CPD hours + events attended count for logged-in users |
| **Event Certificates** | `/certificate/[id]` — formal government-style certificate (double border, navy/gold), A4 landscape print-optimized, `@media print` hides buttons |

### UX Polish & Iterations

| Issue | Fix |
|-------|-----|
| Nav bar translucent vs frosted | Increased glass-panel opacity 0.70→0.82, added `saturate(1.6)` |
| Search box invisible against background | Form reset moved to `@layer base` so Tailwind utilities can override; added `bg-white/70 border border-outline-variant/30` |
| Hero too left-heavy and empty | "极简平行" layout: title left + description right, bottom-aligned |
| Search + filters on separate rows | Combined into single inline row with `flex-1` search + filter pills |
| Nav active state not switching | Added `usePathname()` + conditional `border-b-2 border-blue-600` |
| Signup page too long | Compacted: smaller title, tighter spacing, smaller inputs |
| Auth pages showing PublicNav | Moved to `(auth)` route group (no nav layout) |
| Admin圆角过多 | Unified: containers `rounded-md`, inputs `rounded`, reduced visual noise |
| Event edit: too many individual cards | Single card container + `border-b` separators |
| Capacity showing exact numbers publicly | Changed to "Seats Available" / "Waitlist Open" only |
| QR code not loading | Switched from external API to local `qrcode` lib |
| Blacklist reason truncated | Removed `max-w-xs truncate` |
| Events not open for demo | Pushed all seed event dates to Apr 16-26, 2026 |
| Create Event: no Save as Draft | Added dual action: "Save as Draft" + "Create & Publish" |
| Turbopack HMR crashes | Documented in CLAUDE.md: always restart dev server after file changes |

### Architecture Summary

```
app/
├── (public)/          ← PublicNav + Footer layout
│   ├── events/        ← listing (Server) + filters (Client)
│   ├── events/[id]/   ← detail (Server) + sidebar (Client)
│   ├── register/[id]/ ← form (Server + Client)
│   ├── my-registrations/ ← Client Component
│   └── public-nav.tsx
├── (auth)/            ← No nav, standalone layouts
│   ├── login/
│   ├── signup/
│   └── forgot-password/
├── admin/
│   ├── login/         ← Standalone admin login
│   └── (dashboard)/   ← Sidebar layout + auth check
│       ├── page.tsx (dashboard)
│       ├── events/, events/new, events/[id]/
│       ├── blacklist/
│       ├── audit-log/
│       └── accounts/
├── certificate/[id]/  ← Standalone print-friendly certificate
├── layout.tsx         ← Root: fonts, background accents
└── globals.css        ← Tailwind v4 @theme + utilities
```

**Build**: 0 TypeScript errors, 16 frontend pages + 28 API routes compiled.

---

## v5.1 — Polish, Bug Fixes & Demo Data (2026-04-09)

### Bug Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Free Only button turns white (invisible text) | `glass-panel` bg overrode active state | Separate active/inactive class: `bg-primary text-white` vs `bg-white/70 text-slate-700` |
| Paid event bulk approve fails silently | Stripe key in `.env` placeholder overwrote `.env.local` real key | Commented out placeholder keys in `.env`, let `.env.local` take precedence |
| Set Featured "failed to update" | `isFeatured` not in API PATCH whitelist | Added `if (body.isFeatured !== undefined) data.isFeatured = Boolean(body.isFeatured)` |
| Featured max 2 not enforced | No server-side limit | API checks `count({ isFeatured: true })` before allowing new featured |
| Pricing editable (dangerous) | Could toggle paid→free with existing payments | Made pricing read-only in event edit with "cannot be changed" note |
| Audit log event dropdown shows raw IDs | API didn't include event title | Added `event: { select: { title: true } }` to audit query include |
| Audit log filter dropdowns unstyled | Used native `<select>` with `appearance-none` | Replaced with custom `FilterDropdown` component (click-to-open, pill style) |
| Bulk approve: Stripe error swallowed | `Promise.allSettled` caught exception but didn't count it | Added per-registration try-catch with `failed` counter |
| Static pages don't update after admin changes | Server Components pre-rendered at build time | Added `export const dynamic = "force-dynamic"` to all 9 DB-querying pages |
| Turbopack dev mode `[turbopack]_runtime.js` crash | Next.js 15.5.14 Turbopack SSR bug | Switched to `next build --turbopack && next start` for dev |

### UX Improvements

| Change | Rationale |
|--------|-----------|
| Removed clipboard icon from event grid cards | Non-functional, confusing |
| Removed Manual Check-in input from QR scanner tab | Registration IDs are cuid strings — no one types these manually |
| Register page containers `rounded-xl` → `rounded-lg` | Consistent with admin panel rounded-corner rules |
| Event filters dropdown `rounded-xl` → `rounded-lg` | Consistent border styling |

### Demo Data

Added 4 past ATTENDED events for Phoenix Chen (chenhuangchao2@gmail.com):
- Digital Economy Symposium (4.5 CPD hours)
- Data Governance Workshop (6.0 CPD hours)
- Leadership in Public Service (3.0 CPD hours)
- Cybersecurity Awareness Training (2.0 CPD hours)
- **Total CPD: 15.5 hours** — visible on My Registrations page and "For Your Career" section

### Dev Workflow

| Before | After | Why |
|--------|-------|-----|
| `next dev --turbopack` | `next build --turbopack && next start` | Turbopack dev mode has SSR runtime bug in Next.js 15.5.14 |
| `.env` had placeholder Stripe/Resend keys | `.env` keys commented out | Placeholders overwrote `.env.local` real keys at runtime |
| `output: "standalone"` always on | Commented out for dev | Standalone mode doesn't auto-load `.env.local` at runtime |

**Build**: 0 TypeScript errors. All features verified via curl + browser testing.

---

## v5.2 — NorthFlank Deployment (2026-04-10)

### Deployment Architecture

```
GitHub (chenhuangchao2/govent, main branch)
    │ auto-trigger on push
    ▼
NorthFlank Build (Dockerfile → Docker image)
    │ multi-stage: deps → builder → runner
    ▼
NorthFlank Service (govent)
    │ PORT 3000, standalone mode
    │ CMD: prisma migrate deploy → node server.js
    ▼
NorthFlank PostgreSQL Addon (govent-db)
    │ PostgreSQL 16, US-Central
    ▼
Live URL: https://p01--govent--c2c7vkvx9sv9.code.run
```

### Deployment Issues & Resolutions

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Build fails: `Missing API key Resend` | Webpack build instantiates Resend/Stripe at build time | Added dummy env vars in Dockerfile build stage |
| Build fails: `DATABASE_URL not found` | Prisma needs DATABASE_URL at webpack build time | Added dummy DATABASE_URL in build stage |
| Runtime: `sh: prisma: not found` | Standalone mode has no node_modules, `npx` unavailable | Changed CMD to `node node_modules/prisma/build/index.js migrate deploy` |
| Runtime env vars overwritten | NorthFlank POST `/runtime-environment` replaces all vars | Re-set all 8 env vars in single API call |
| Shell: `DATABASE_URL not found` | NorthFlank shell doesn't inherit runtime env vars | Created `/api/seed` endpoint (HTTP-based seeding) |
| Need to re-seed | Seed endpoint checks `if existingUsers > 0` | Added `?reset=true` query param to wipe and re-seed |

### Prisma Migration Strategy

Chose `prisma migrate deploy` over `prisma db push` for production:
- **Why**: Migration files are version-controlled SQL, reproducible across environments, auditable
- **How**: `prisma/migrations/20260409000000_init/migration.sql` — full schema as initial migration
- **Deploy**: Dockerfile CMD runs `prisma migrate deploy` before `node server.js`
- **Dev**: `prisma migrate resolve --applied` marks existing dev DB as up-to-date

### Seed Data (Production)

Created `/api/seed` endpoint (protected by `CRON_SECRET` header):

| Data | Count | Details |
|------|-------|---------|
| Admin users | 3 | Phoenix Chen (Super Admin), Sarah Lim, Rajan Kumar |
| Upcoming events | 7 | Various topics, 2 featured, 1 paid, org-restricted |
| Past events | 4 | All ATTENDED by demo users, CPD hours |
| Registrations | 130+ | Realistic distribution: PENDING, APPROVED, WAITLISTED (only on full events), REJECTED, CANCELLED |
| Blacklist | 3 | AUTO_NO_SHOW, AUTO_PAYMENT, MANUAL sources |
| Audit log | 12 | CREATE, PUBLISH, APPROVE, REJECT, BULK_APPROVE, CHECKIN, BROADCAST, EDIT |
| Participant | 1 | demo@gov.sg / demo123 (verified, with CPD history) |

### Environment Variables (NorthFlank)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | NorthFlank PostgreSQL addon connection string |
| `SESSION_SECRET` | iron-session encryption key (32+ chars) |
| `CRON_SECRET` | Protects cron + seed endpoints |
| `STRIPE_SECRET_KEY` | Stripe test mode key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM` | Email sender address |
| `NEXT_PUBLIC_APP_URL` | Public URL for Stripe redirects |

### Production URLs

| Page | URL |
|------|-----|
| Public events | https://p01--govent--c2c7vkvx9sv9.code.run/events |
| Participant login | https://p01--govent--c2c7vkvx9sv9.code.run/login |
| Admin login | https://p01--govent--c2c7vkvx9sv9.code.run/admin/login |

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@tech.gov.sg | admin123 |
| Admin | sarah@tech.gov.sg | admin123 |
| Admin | rajan@tech.gov.sg | admin123 |
| Participant | demo@gov.sg | demo123 |

**Build**: 0 TypeScript errors. Production deployed and verified.
