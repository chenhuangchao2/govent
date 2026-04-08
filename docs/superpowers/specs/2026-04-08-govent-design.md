# GovEvent — Design Spec
**Date**: 2026-04-08

## What We're Building

Internal government event & workshop registration system. Replaces Google Forms. Data stays on agency infrastructure. Server-side eligibility enforcement. Full audit trail.

## Full Design References

All design decisions are documented in:
- [`docs/REQUIREMENTS.md`](../REQUIREMENTS.md) — user stories, full feature list, status machine, integrations
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — system diagram, components, deployment, limitations
- [`docs/DATA_FLOW.md`](../DATA_FLOW.md) — 7 end-to-end flows with walkthrough scripts
- [`CLAUDE.md`](../../CLAUDE.md) — tech stack, conventions, entity summary

## Tech Stack

Next.js 15 (App Router) · TypeScript · Prisma 5 · PostgreSQL · Tailwind · shadcn/ui · Resend · Stripe Checkout · NorthFlank Cron · Docker

## Core Entities

| Entity | Purpose |
|--------|---------|
| `User` | Organizer/admin accounts |
| `Event` | Event details, capacity, eligibility rules, payment config, CPD hours |
| `Registration` | Per-person record — status + payment status |
| `Blacklist` | Blocked emails with reason, source, no-show count |
| `AuditLog` | Immutable record of all organizer actions |

## Registration Status Machine

`PENDING` → `APPROVED` / `REJECTED` / `WAITLISTED`
Paid events: `APPROVED` → `PENDING_PAYMENT` → `APPROVED` / `PAYMENT_FAILED`
Post-event: `APPROVED` → `ATTENDED` / `NO_SHOW`

## External Integrations

| Service | Direction | Purpose |
|---------|-----------|---------|
| Resend | Outbound | All transactional email |
| Stripe Checkout | Outbound + Inbound webhook | Paid event payments |
| NorthFlank Cron | Triggers `/api/cron/*` | Reminders, timeout checks, NO_SHOW marking |

## Development Phases

| Phase | Scope |
|-------|-------|
| 1 | Data modeling — `prisma/schema.prisma` + seed data |
| 2 | Backend API — all route handlers |
| 3 | Frontend public pages — event listing, detail, registration form |
| 4 | Frontend admin — approval dashboard, check-in, audit log, blacklist |
| 5 | Integrations — Resend emails + Stripe payments + Cron jobs |
| 6 | Deployment — Docker build + NorthFlank |

## Constraints

- 3–5 day build window
- Single developer using AI-assisted development
- Must deploy to NorthFlank
- No Singpass/Corppass (email domain check only for this prototype)
- Stripe in test mode only
