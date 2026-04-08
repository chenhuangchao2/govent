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

## Current Status
**Phase**: 0 complete — skeleton built, requirements locked
**Next step**: Phase 1 — data modeling (`prisma/schema.prisma`)

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
