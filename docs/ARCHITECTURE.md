# Architecture Overview — GovEvent

## Problem Statement

Government agencies run internal workshops and training sessions using Google Forms. This creates three problems: registration data sits on foreign third-party servers, there is no server-side eligibility enforcement, and there is no audit trail when compliance officers ask who attended what. GovEvent solves all three on the agency's own infrastructure.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
│                                                                  │
│   Public Pages                      Admin Pages                  │
│   /events          (Server)         /admin/events     (Server)   │
│   /events/[id]     (Server)         /admin/events/[id](S+Client) │
│   /register        (Client)         /admin/audit-log  (S+Client) │
│   /my-registrations(Server)         /admin/blacklist  (S+Client) │
└──────────────┬───────────────────────────────┬───────────────────┘
               │ HTTP                           │ HTTP
               ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js 15 Server (NorthFlank)                   │
│                                                                  │
│   API Routes                                                     │
│   POST /api/registrations          ← submit registration         │
│   PATCH /api/registrations/[id]    ← approve / reject            │
│   POST /api/registrations/[id]/checkin ← QR scan check-in       │
│   POST /api/events                 ← create event                │
│   PATCH /api/events/[id]           ← edit / cancel event         │
│   POST /api/webhook/stripe         ← receive Stripe events       │
│   GET  /api/cron/reminders         ← T-48h reminder job          │
│   GET  /api/cron/no-shows          ← post-event NO_SHOW marking  │
│   GET  /api/cron/payment-timeout   ← expired payment cleanup     │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  services/                                               │  │
│   │  email.ts     → Resend API wrapper                       │  │
│   │  stripe.ts    → Stripe session + webhook handler         │  │
│   │  blacklist.ts → Blacklist check + auto-trigger logic     │  │
│   └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│   ┌──────────────────────────▼───────────────────────────────┐  │
│   │  Prisma 5 ORM                                            │  │
│   └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────-│───────────────────────────────────┘
                               │
              ┌────────────────┼──────────────────────┐
              ▼                ▼                      ▼
   ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────┐
   │  PostgreSQL DB   │  │  Resend API  │  │  Stripe API          │
   │  (NorthFlank)    │  │  (email)     │  │  (payments+webhooks) │
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
- **Technology**: Next.js 15 App Router, React Server Components
- **UI**: shadcn/ui + Tailwind CSS
- **Pattern**: Server Components for all read paths; `'use client'` only for interactive islands (registration form, QR scanner, real-time check-in)

| Page | Type | Description |
|------|------|-------------|
| `/events` | Server | Public event listing with live seat counts |
| `/events/[id]` | Server | Event detail + registration form entry |
| `/register/[id]` | Client | Registration form with inline eligibility validation |
| `/my-registrations` | Server | Participant's registration history + QR codes |
| `/admin` | Server | Dashboard overview |
| `/admin/events` | Server | Event management list |
| `/admin/events/[id]` | Server+Client | Event detail with 3-tab layout (Overview / Registrations / Check-in). Overview fields are inline-editable (click to edit). |
| `/admin/audit-log` | Server+Client | Audit log — card-based list grouped by date, color-coded action badges, filter by action/event/time-period, pagination |
| `/admin/blacklist` | Server+Client | Blacklist management with AlertDialog confirmation |

### Backend (API Routes)
- All routes return `{ data, error }` format
- Admin routes check session before processing
- Cron routes check `CRON_SECRET` header

### Data Storage
- **PostgreSQL** on NorthFlank managed database (prod) / Docker (local)
- **Prisma 5** as ORM — schema is the single source of truth; TypeScript types generated from schema

### External Integrations

| Service | Purpose | Direction |
|---------|---------|-----------|
| **Resend** | Transactional email (confirmation, approval, payment link, reminder, blacklist notice) | Outbound |
| **Stripe Checkout** | Paid event registration payment | Outbound (create session) + Inbound (webhook) |
| **NorthFlank Cron** | Scheduled jobs: T-48h reminders, payment timeout cleanup, post-event NO_SHOW marking | Triggers `/api/cron/*` |

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

- Users are internal staff identified by email domain (no Singpass/Corppass for this prototype)
- Admin authentication is simple session-based; single admin role (no multi-level permissions)
- Stripe is in test mode during assessment; real money is never charged
- NorthFlank Cron fires hourly; reminder emails may arrive up to 1 hour early/late relative to the 48h window
- Paid event refunds are manual (no automated Stripe refund flow)

## Known Limitations

- No real-time push (waitlist promotion and seat counter use polling / page refresh)
- No multi-level approval chain (single organizer approve/reject only)
- No Singpass/Corppass identity verification (email domain check only)
- No mobile-native QR scanner app — uses browser camera API

## What I Would Improve for Production

- Replace session auth with Singpass/Corppass for verified government identity
- Add Zod schema validation on all API inputs
- Move email sending to a background queue (avoid blocking API response on Resend latency)
- Add rate limiting on registration endpoints
- Add error monitoring (Sentry)
- Implement multi-level approval workflow (registrant → manager → training coordinator)
