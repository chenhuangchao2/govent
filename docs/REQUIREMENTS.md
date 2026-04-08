# Requirements — GovEvent

## Use Case
**Internal Government Event & Workshop Registration System**

> Replaces Google Forms for agency internal events. Data stays on the agency's own infrastructure. Registration eligibility is enforced server-side. Every action is fully auditable.

---

## Roles

| Role | Description |
|------|-------------|
| **Organizer** | Internal staff who creates and manages events. Full admin dashboard access. |
| **Participant** | Internal staff who registers to attend events via the public-facing pages. |
| **System** | Automated backend logic: state transitions, scheduled tasks, notifications. |

---

## Must-Have Checklist

### Full-Stack Application
- [ ] Public event listing + registration form (frontend)
- [ ] Admin dashboard: event management + approval workflow (frontend)
- [ ] API routes with business logic and validation (backend)
- [ ] PostgreSQL database via Prisma (storage)

### Integration & Data Flow
- [ ] **Resend API** — transactional emails (confirmation, approval, payment, reminders)
- [ ] **Stripe Checkout** — paid event registration (outbound: create session; inbound: webhook)
- [ ] **NorthFlank Cron** — scheduled tasks (T-48h reminders, timeout checks, NO_SHOW marking)
- [ ] Can explain full data flow end-to-end for every key action

### Deployment
- [ ] Docker build passes
- [ ] Deployed on NorthFlank with working public URL
- [ ] Functional at walkthrough time

### Submission Materials
- [ ] Working app URL
- [ ] Source code / repo link
- [ ] `docs/BUILD_LOG.md`
- [ ] `docs/ARCHITECTURE.md`

---

## Core Features (Must Demo)

### Event Management
- Create event: title, description, date/time, venue, capacity, registration deadline, eligibility rules (email domain / department whitelist), paid/free toggle, price, CPD hours
- Publish / unpublish / edit / cancel event
- Cancel triggers automatic notification to all registrants

### Registration Flow
- Public event listing with live seat counter ("87 / 120") and eligibility label
- Event detail page
- Registration form with **inline, instant** eligibility validation (no page reload):
  - Check 1: Blacklist
  - Check 2: Eligibility rules (email domain / department)
  - Check 3: Registration deadline
  - Check 4: Capacity → auto-assign WAITLISTED if full
- Cancel registration (triggers waitlist auto-promotion)
- "My Registrations" page: history, status, CPD hours accumulated

### Approval Workflow
- Admin registration list filtered by status (PENDING / APPROVED / REJECTED / WAITLISTED / ATTENDED / NO_SHOW)
- Approve / Reject per record (rejection requires reason)
- One-click resend confirmation email

### Paid Events — Stripe
- On Approve of a paid registration → system creates Stripe Checkout Session → sends payment link email
- Stripe webhook (`/api/webhook/stripe`): verify signature → update status to APPROVED → send confirmation email + QR code
- Payment timeout auto-handling: mark PAYMENT_FAILED, trigger waitlist promotion, increment no-show count
- Manual mark-as-paid (for offline transfers)

### QR Code Check-in
- QR code included in approval email and "My Registrations" page
- Organizer enters full-screen check-in mode
- Scan QR → mark ATTENDED (green flash on success)
- Defined error states:
  - Duplicate scan: "Already checked in at HH:MM"
  - Wrong event / expired / revoked: distinct messages
- Manual name/email search as fallback

### Blacklist
- Admin view: email, reason, source (manual / auto), date added
- Manual add (requires reason) / remove
- Auto-trigger: no-show count ≥ 2 (configurable)
- Blacklist notification email sent to affected user

### Audit Log
- All organizer actions logged: actor, action type, target ID, timestamp, IP
- Rendered as timeline in admin dashboard
- Exportable for compliance filing

---

## Enhanced Features (Build If Time Allows)

| Feature | Description |
|---------|-------------|
| T-48h reminder emails | NorthFlank Cron runs hourly; queries events starting in ~48h; sends Resend email to all APPROVED; sets `reminderSent = true` to prevent duplicates |
| Post-event feedback | 1h after event ends, send 1–5 rating + one open question to ATTENDED participants only; results visible in attendance report |
| CPD hours tracking | Auto-record CPD hours on check-in; shown in "My Registrations" |
| Broadcast message | Organizer sends ad-hoc message to all APPROVED participants for a given event |
| CSV export | Attendance list: name, email, department, status, check-in time |
| Event archive | Mark event as COMPLETED |

---

## Registration Status Machine

```
Submit
  │
  ├─ Blacklisted / ineligible / past deadline ──→ Rejected (not saved to DB)
  │
  ├─ At capacity ───────────────────────────────→ WAITLISTED
  │                                                    │ auto-promote on vacancy
  └─ Eligible + capacity available ────────────→ PENDING ←──────────────────┘
                                                     │
                                         ┌───────────┴───────────┐
                                         ▼                       ▼
                                     REJECTED               (Approve)
                                     → promote waitlist          │
                                                    ┌────────────┴──────────────┐
                                                    ▼ free                      ▼ paid
                                                APPROVED             PENDING_PAYMENT
                                                    │                Stripe link sent
                                                    │            ┌───────┴────────┐
                                                    │          paid           timeout
                                                    │        APPROVED    PAYMENT_FAILED
                                                    │                    → promote waitlist
                                                    │                    no-show count +1
                                            ┌───────┴───────┐
                                            ▼               ▼
                                        ATTENDED         NO_SHOW
                                       (QR scan)    (marked post-event)
                                                     no-show count +1
                                                     → threshold → Blacklist
```

---

## External Integrations

| Integration | Purpose | Direction |
|-------------|---------|-----------|
| **Resend** | All transactional email | Outbound (app → Resend API) |
| **Stripe Checkout** | Paid event payment | Outbound (create session) + Inbound (webhook) |
| **NorthFlank Cron** | Scheduled jobs | Triggers internal `/api/cron/*` endpoints hourly |

---

## Key Entities (Expanded in `prisma/schema.prisma`)

- `Event` — event details, capacity, eligibility rules, payment config
- `Registration` — per-person registration with status + payment status
- `Blacklist` — blocked emails with reason and no-show count
- `AuditLog` — immutable record of all organizer actions
- `User` (Organizer) — admin authentication
