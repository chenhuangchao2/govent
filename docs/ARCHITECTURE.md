# Architecture Overview — GovEvent

## Problem Statement

Government agencies run workshops and training sessions using Google Forms. This creates three problems: registration data sits on third-party servers, there is no server-side eligibility enforcement, and there is no audit trail for compliance. GovEvent solves all three on the agency's own infrastructure.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
│                                                                  │
│   Public Pages                      Admin Pages                  │
│   /events          (Server+Client) /admin            (Server+C)  │
│   /events/[id]     (Server+Client) /admin/events     (Server+C)  │
│   /register/[id]   (Server+Client) /admin/events/new (Client)    │
│   /my-registrations(Client)        /admin/events/[id](S+Client)  │
│   /login           (Client)        /admin/blacklist  (S+Client)  │
│   /signup          (Client)        /admin/audit-log  (Client)    │
│   /forgot-password (Client)        /admin/accounts   (S+Client)  │
│   /certificate/[id](Server)                                      │
└──────────────┬───────────────────────────────┬───────────────────┘
               │ HTTP                           │ HTTP
               ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js 15 Server (NorthFlank)                   │
│                                                                  │
│   API Routes                                                     │
│   POST /api/registrations              ← submit registration     │
│   PATCH /api/registrations/[id]        ← approve/reject/notes    │
│   POST /api/registrations/[id]/checkin ← QR scan check-in       │
│   POST /api/registrations/bulk-approve ← batch approve           │
│   POST /api/registrations/self-cancel  ← participant cancel      │
│   GET  /api/registrations/export       ← CSV download            │
│   POST /api/events                     ← create event            │
│   PATCH /api/events/[id]               ← edit/cancel/publish     │
│   POST /api/events/[id]/broadcast      ← email all attendees     │
│   GET  /api/events/[id]/checkin-stats  ← live check-in progress  │
│   GET  /api/analytics                  ← dashboard stats         │
│   POST /api/auth/participant/*         ← signup/verify/login     │
│   POST /api/webhook/stripe             ← Stripe payment events   │
│   GET  /api/cron/*                     ← scheduled jobs          │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  services/                                               │  │
│   │  email.ts     → Resend API (confirm, approve, broadcast) │  │
│   │  stripe.ts    → Stripe Checkout session creation         │  │
│   │  blacklist.ts → Blacklist check + auto-trigger           │  │
│   │  waitlist.ts  → Auto-promote on vacancy                  │  │
│   │  qr.ts        → QR code generation                       │  │
│   └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│   ┌──────────────────────────▼───────────────────────────────┐  │
│   │  Prisma 5 ORM (6 models: User, Participant, Event,      │  │
│   │  Registration, Blacklist, AuditLog)                       │  │
│   └──────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────│───────────────────────────────────┘
                               │
              ┌────────────────┼──────────────────────┐
              ▼                ▼                      ▼
   ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────┐
   │  PostgreSQL DB   │  │  Resend API  │  │  Stripe API          │
   │  (NorthFlank)    │  │  (email+OTP) │  │  (payments+webhooks) │
   └──────────────────┘  └──────────────┘  └──────────────────────┘
              ▲
   ┌──────────┴───────────┐
   │  NorthFlank Cron     │
   │  (hourly job)        │
   └──────────────────────┘
```

---

## Key Components

### Frontend
- **Technology**: Next.js 15 App Router, React Server Components + Client Components
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts (pie, bar charts on admin dashboard)
- **Icons**: lucide-react
- **Pattern**: Server Components for data fetching; `'use client'` for interactive features
- **Auth**: Participant auth (email+password+OTP), Admin auth (session-based)

| Page | Type | Description |
|------|------|-------------|
| `/events` | Server+Client | Event listing with search, time/cost/organisation filters |
| `/events/[id]` | Server+Client | Event detail with registration status check (session-aware) |
| `/register/[id]` | Server+Client | Registration form — pre-fills from session if logged in |
| `/my-registrations` | Client | Requires login. Upcoming/past split, self-cancel, print QR, CPD summary |
| `/login` | Client | Participant sign-in with redirect support |
| `/signup` | Client | Two-step: credentials → OTP email verification |
| `/admin` | Server+Client | Dashboard: 4 stat cards + quick actions |
| `/admin/events` | Server | Event list with status badges and capacity indicators |
| `/admin/events/new` | Server+Client | Create event form |
| `/admin/events/[id]` | Server+Client | 3-tab layout: Overview (inline edit) / Registrations (bulk approve, CSV export, notes) / Check-in (QR/search/manual + live stats) |
| `/admin/analytics` | Server+Client | Recharts dashboard: 6 visualizations (pie, bar, line charts) |
| `/admin/audit-log` | Server+Client | Card-based timeline, grouped by date, filterable |
| `/admin/blacklist` | Server+Client | CRUD with AlertDialog confirmation |

### Backend (API Routes)
- All routes return `{ data, error }` format
- Admin routes protected by `requireAdmin()` session check
- Participant routes protected by `requireParticipant()` session check
- Cron routes protected by `CRON_SECRET` header

### Data Storage
- **PostgreSQL** on NorthFlank (prod) / Docker (local)
- **Prisma 5** as ORM — schema is single source of truth
- **6 models**: User (admin), Participant (public users), Event, Registration, Blacklist, AuditLog

### External Integrations

| Service | Purpose | Direction |
|---------|---------|-----------|
| **Resend** | Transactional email + OTP verification codes | Outbound |
| **Stripe Checkout** | Paid event payment collection | Outbound (session) + Inbound (webhook) |
| **NorthFlank Cron** | Reminders, payment timeout, NO_SHOW marking | Triggers `/api/cron/*` |

---

## Authentication

| Role | Method | Session |
|------|--------|---------|
| **Admin** | Email + password (seeded account) | `govent-session` cookie |
| **Participant** | Email + password + OTP verification | `govent-participant` cookie |
| **Guest** | No auth required | Browse events freely |

---

## Deployment

```
Local Development                Production (NorthFlank)
─────────────────                ───────────────────────
docker-compose.yml               Single Docker service (multi-stage build)
  ├── app  (port 3000)             next.config.ts: output = "standalone"
  └── postgres (port 5432)         
                                 NorthFlank Managed PostgreSQL
                                 NorthFlank Cron Job (hourly)
                                 Environment variables via NorthFlank secrets
```

---

## Key Assumptions

- Participants identified by email + password (no Singpass/Corppass for this prototype)
- Admin authentication is single-role (no multi-level permissions)
- Stripe is in test mode; real money is never charged
- NorthFlank Cron fires hourly; reminders may arrive ±1 hour of the 48h window
- Paid event refunds are manual

## Known Limitations

- No real-time push (uses polling / page refresh)
- No multi-level approval chain (single organizer only)
- No Singpass/Corppass identity verification
- No mobile-native QR scanner — uses browser camera API
- Check-in requires ±2h time window from event start/end

## Scalability Considerations

| Dimension | Current Design | At Scale (10K+ events, 100K+ registrations) |
|-----------|---------------|---------------------------------------------|
| **Database queries** | Prisma ORM, indexed on `eventId + email` (unique), `eventId + status` | Add composite indexes on `(eventId, status)` and `(email)` for registration lookups |
| **Capacity check** | `db.$transaction` prevents race conditions on last seat | Adequate for moderate concurrency; high-throughput events may need `SELECT FOR UPDATE` |
| **Cron jobs** | Process all pending records in a single pass | Paginate with cursor-based batching to avoid timeout on large datasets |
| **Email sending** | Synchronous via Resend API (best-effort, non-blocking for main flow) | Move to background job queue (BullMQ/Redis) to decouple latency |
| **Check-in polling** | 10s interval from client | Replace with WebSocket for instant updates; add Redis pub/sub for multi-instance |
| **Analytics queries** | Full table scans with `Promise.all` | Pre-aggregate into materialized views or cache with Redis (TTL: 5 min) |
| **QR code generation** | Generated on-demand per approval | Cache generated QR data URLs — they're deterministic from registration ID |

## Failure Modes

| Failure | Impact | Current Handling | Production Improvement |
|---------|--------|------------------|----------------------|
| **Resend API down** | Emails not sent (OTP, approval, payment link) | Best-effort: `.catch(console.error)`, registration state still saved | Add retry queue with exponential backoff; show "email pending" status in UI |
| **Stripe webhook fails** | Payment received but registration not updated | Stripe retries automatically (up to 3 days) | Add idempotency key; reconciliation cron that checks Stripe for missed webhooks |
| **Database unavailable** | All API calls fail | Prisma throws, Next.js returns 500 | Add health check endpoint; configure NorthFlank auto-restart; alert via Sentry |
| **Event cancelled during payment** | User pays for cancelled event | Webhook checks `event.isCancelled`, marks registration CANCELLED with PAID status | Add Stripe refund API call; notify participant of automatic refund |
| **Concurrent last-seat registrations** | Two users see "1 seat left" simultaneously | `db.$transaction` with count-then-create ensures only one gets the seat | Adequate for government event scale (~100 concurrent users max) |
| **Cron fires twice** | Duplicate reminders, double no-show marking | Idempotent flags: `reminderSent`, `noShowProcessed` prevent duplicates | Sufficient — flags make cron jobs safely re-runnable |

## What I Would Improve for Production

- Replace email+password with Singpass/Corppass for verified government identity
- Move email sending to a background queue (BullMQ/Redis)
- Add rate limiting on registration and auth endpoints
- Add error monitoring (Sentry)
- Implement WebSocket for real-time check-in stats and seat updates
- Multi-level approval workflow (registrant → manager → coordinator)
- WCAG 2.1 AA accessibility audit
- Database connection pooling (PgBouncer) for high-concurrency scenarios
