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
- **v2.0** — _in progress_ — Full UX pass: event editing, publish/cancel controls, payment status visibility, confirmation dialogs, toast feedback, auto-refresh, check-in fallback. See `docs/superpowers/specs/` for design spec.

## Current Status
**Version**: v1.0-mvp tagged → v2.0 in design/planning
**Integrations**: Resend ✅ · Stripe ✅ (local webhook via CLI) · NorthFlank deployment pending

**What's working (v1.0)**
- 15 API routes + 3 cron endpoints operational
- Public: event listing, event detail, registration form (eligibility + capacity), my-registrations + QR display
- Admin: dashboard stats, event list, create event, registration approve/reject inline, QR check-in scanner, audit log, blacklist CRUD
- `npm run build` 0 TypeScript errors · 30 routes compiled

**Known gaps in v1.0 — upgrading in v2.0**
See `docs/V1_STATUS.md` for full gap list. Critical items:
- No event edit form (admin can only create, not update)
- No publish / unpublish / cancel buttons on event detail page
- Payment status not shown in My Registrations
- No confirmation dialogs on destructive actions (blacklist add/remove, event cancel)
- No toast/feedback after approve/reject — table doesn't auto-refresh
- Check-in has no camera-failure fallback beyond manual ID entry
- Audit log not filterable, no pagination beyond 200 records

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
