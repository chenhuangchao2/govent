# Project: GovEvent
> DAP GovTech Technical Consultant Assessment
> Internal Government Event & Workshop Registration System

## Product Summary
Replaces Google Forms for agency internal events. Data stays on the agency's own infrastructure. Registration eligibility is enforced server-side. Every action is fully auditable.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: PostgreSQL (NorthFlank managed DB in prod, Docker in local)
- **ORM**: Prisma 5 — schema is the single source of truth for all data types
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Simple session-based admin auth (no NextAuth — keep it simple)
- **Email**: Resend API
- **Payments**: Stripe Checkout (outbound session creation + inbound webhook)
- **Scheduled Jobs**: NorthFlank Cron → `/api/cron/*` endpoints
- **Deployment**: Docker → NorthFlank

## Key Entities
- `Event` — event details, capacity, eligibility rules, payment config, CPD hours
- `Registration` — per-person record with status + payment status
- `Blacklist` — blocked emails with reason, source, no-show count
- `AuditLog` — immutable record of all organizer actions
- `User` — organizer/admin accounts

## Registration Status Values
`PENDING` → `APPROVED` / `REJECTED` / `WAITLISTED`
`APPROVED` (paid events go via `PENDING_PAYMENT` first)
`ATTENDED` (QR scan) / `NO_SHOW` (auto-marked post-event) / `PAYMENT_FAILED`

## Code Conventions
- All API routes return `{ data, error }` format
- Use Server Components by default; add `'use client'` only when interactivity is needed
- Prisma schema drives TypeScript types — do NOT define duplicate interfaces
- Environment variables in server-side code only (never in client components)
- Naming: `camelCase` variables/functions, `PascalCase` components, `kebab-case` files
- Stripe webhook handler at `/api/webhook/stripe` — verify signature before processing
- Cron endpoints at `/api/cron/*` — protected by `CRON_SECRET` header

## Project Structure
```
app/
├── CLAUDE.md                    ← You are here
├── docs/
│   ├── REQUIREMENTS.md          ← Full feature spec + user stories
│   ├── BUILD_LOG.md             ← Development log (update every phase)
│   ├── ARCHITECTURE.md          ← Finalise before submission
│   └── DATA_FLOW.md             ← Finalise before submission
├── prisma/
│   └── schema.prisma            ← Single source of truth for data model
├── app/                         ← Next.js App Router
│   ├── (public)/                ← Event listing, detail, registration form
│   ├── admin/                   ← Organizer dashboard (protected)
│   └── api/                     ← All backend logic lives here
│       ├── events/
│       ├── registrations/
│       ├── webhook/stripe/
│       └── cron/
├── components/
│   ├── ui/                      ← shadcn/ui primitives
│   ├── layout/                  ← Sidebar, Header
│   └── features/                ← Business components
├── lib/
│   ├── db.ts                    ← Prisma client singleton
│   ├── auth.ts                  ← Session auth helpers
│   └── utils.ts
├── services/
│   ├── email.ts                 ← Resend wrapper
│   ├── stripe.ts                ← Stripe helpers
│   └── blacklist.ts             ← Blacklist check logic
├── Dockerfile
└── docker-compose.yml
```

## Version History
- **v1.0-mvp** (git tag) — 2026-04-08 — Bare-bones MVP. All core flows wired up but rough edges throughout. See `docs/V1_STATUS.md` for known gaps.
- **v2.0** — _in progress_ — Full UX pass + new features. See `docs/superpowers/specs/2026-04-08-govent-v2-design.md` for complete spec.

## Current Status
**Version**: v2.4 complete (participant auth + UX polish)
**Integrations**: Resend ✅ · Stripe ✅ (local webhook via CLI) · NorthFlank deployment pending
**Next step**: Deployment to NorthFlank, final documentation

**Phase 2.4 — Participant Auth + UX Polish ✅ (2026-04-08)**
- Participant model: email + password + OTP email verification
- Sign Up: name/email/password → OTP via Resend → verify → session
- Sign In: email/password → session (iron-session, separate from admin)
- PublicNav: auth-aware (Sign In/Up for guests, name + Sign Out for users)
- My Registrations: requires login, auto-loads from session
- Registration form: pre-fills from session, email read-only when logged in
- Event detail: session-based registration status check
- Department → Organisation rename (whole stack)
- Venue hiding removed (always show venue, TBC if empty)
- Event filters: search + time + cost + organisation
- Re-registration: CANCELLED/REJECTED can re-register
- Stripe expires_at fix (max 24h), Stripe URL fix, API error handling

**Phase 2.3 — Power Features ✅ (2026-04-08)**
- Schema: added `adminNotes String?` to Registration
- Analytics: `/admin/analytics` page with 6 Recharts visualizations (pie, bar, line charts)
- Broadcast: `POST /api/events/[id]/broadcast` + BroadcastModal in event detail header
- Check-in upgrade: tabbed layout (QR/Search/Manual), camera error handling, Enter key, live stats panel with 10s polling
- QR time-window: ±2h validation on check-in API
- CSV export: `GET /api/registrations/export` + download button in registrations toolbar
- Bulk approve: `POST /api/registrations/bulk-approve` + selection bar with AlertDialog
- Admin notes: `add-note` action + auto-saving AdminNotesField component
- Self-cancel: `POST /api/registrations/self-cancel` + SelfCancelButton in My Registrations
- Navigation: Analytics link in sidebar + quick action on dashboard
- Build: 0 TypeScript errors, 36 routes compiled

**Phase 2.2 — UI Overhaul + Public UX ✅ (2026-04-08)**
- Schema: added `venueHidden Boolean @default(false)` to Event
- Admin sidebar: lucide-react icons, navy government color, active state highlights
- Admin dashboard: 4 stat cards with icons + quick-action buttons
- Admin events list: clickable titles, capacity colors, polished badges, empty state
- EventOverview + EventForm: venueHidden toggle for venue hiding
- Public event cards: redesigned with CapacityBar, venue hiding, clean layout
- Public event detail: DeadlineCountdown, capacity bar, venue hiding, info card layout
- Registration form: real-time eligibility preview, rich success screen with CTAs
- My Registrations: proper types, Pay Now button, CPD hours summary, venue display
- PublicNav: mobile hamburger menu, Landmark icon, government colors, footer
- Loading skeletons on 4 pages (events, event detail, admin events, audit log)
- Deleted legacy AuditTimeline.tsx, standalone registrations page; checkin redirects to tab

**Phase 2.1 — Admin Core Completion ✅ (2026-04-08)**
- shadcn Sonner + AlertDialog + Dialog installed; Toaster in root layout
- Event detail: 3-tab layout (Overview / Registrations / Check-in) — all management in one page
- Event overview: inline click-to-edit fields (Enter saves, Esc cancels)
- Publish/unpublish/cancel action buttons with AlertDialog confirmation
- PATCH /api/events/[id] extended to save all fields + error handling for missing records
- RegistrationRow: toast feedback, RejectModal replaces inline reject form
- Registrations table: fetch-all + client-side filter, status counts, name/email search
- BlacklistTable: AlertDialog confirmation before add/remove; defensive JSON parsing
- Audit log: card-based list grouped by date, color-coded action badges, time-period filter (Today/7d/30d/All), event title display, 50/page pagination
- Logout: redirects to login page after session destroy
- Blacklist auto-threshold: 5 no-shows (changed from 2)

**What's working (v1.0)**
- 15 API routes + 3 cron endpoints operational
- Public: event listing, event detail, registration form (eligibility + capacity), my-registrations + QR display
- Admin: dashboard stats, event list, create event, registration approve/reject inline, QR check-in scanner, audit log, blacklist CRUD
- `npm run build` 0 TypeScript errors · 30 routes compiled

**Known gaps in v1.0 — upgrading in v2.0**
See `docs/V1_STATUS.md` for full gap list and `docs/superpowers/specs/2026-04-08-govent-v2-design.md` for the complete v2.0 plan.

**v2.0 Feature Blocks (priority order):**
1. **Block 1** — Event edit form + publish/unpublish/cancel buttons (critical: API exists, no UI)
2. **Block 3** — Global toast system + registrations auto-refresh + status counts + search + reject modal
3. **Feature J** — Full UI overhaul: better visual hierarchy, government color system, mobile-responsive public pages, admin tab layout
4. **Block 2** — Payment status visible in My Registrations (PENDING_PAYMENT badge, Pay Now button)
5. **Block 9** — Venue hiding: venue hidden from public, revealed only to APPROVED registrants (schema: `venueHidden`)
6. **Feature I** — Admin analytics dashboard at `/admin/analytics` (Recharts: fill rate, status breakdown, check-in trend, dept breakdown)
7. **Block 5** — Check-in: camera error handling + name/email search fallback + Enter key
8. **Block 6** — Audit log: filter by action/event, pagination, human timestamps
9. **Feature C** — Event broadcast notification (admin → all APPROVED/WAITLISTED via Resend)
10. **Feature A** — CPD hours accumulation dashboard (participant-facing, My Registrations)
11. **Block 4** — Confirmation dialogs on all destructive actions (shadcn AlertDialog)
12. **Block 7** — Registration form: success CTA, real-time eligibility preview, Enter key
13. **Feature B** — Admin internal notes on registrations (schema: `adminNotes`)
14. **Features D/E/F** — Deadline countdown, capacity progress bar, QR time-window validation (±2h)
15. **Block 8** — CSV export, participant self-cancel, print QR, bulk approve
16. **Feature H** — Check-in real-time stats panel (checked in / total, last 5 scans)

**Schema additions in v2.0:**
- `Event.venueHidden Boolean @default(false)` — venue hiding
- `Registration.adminNotes String?` — admin notes

**New API endpoints in v2.0:**
- `POST /api/events/[id]/broadcast` — send email to all attendees
- `GET /api/analytics` — aggregated stats
- `GET /api/events/[id]/checkin-stats` — live check-in progress
- `GET /api/registrations/[eventId]/export` — CSV download

## Files to Maintain
- **`docs/BUILD_LOG.md`** — update every phase (auto-updated by Claude)
- **`CLAUDE.md`** — update `Current Status` after each phase
- **`prisma/schema.prisma`** — update when data model changes

## Do NOT
- Do not add test files — out of scope
- Do not use CSS Modules — Tailwind only
- Do not use `fetch` directly in components — use Server Components or API routes
- Do not commit `.env` files
- Do not install Prisma 6 or 7 — stay on Prisma 5
