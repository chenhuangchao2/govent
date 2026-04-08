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
**Date**: _TBD (Resend + Stripe keys required)_ | **Tool**: _TBD_

Integration code is written and ready. Pending:
- Add Resend API key to `.env` (`RESEND_API_KEY`)
- Add Stripe test keys to `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- Run `stripe listen --forward-to localhost:3000/api/webhook/stripe` to test webhook locally

---

## Phase 5 — Deployment
**Date**: _TBD_ | **Tool**: _TBD_

---

## What I Would Do Differently
_To be filled before submission._
