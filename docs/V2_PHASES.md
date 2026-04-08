# GovEvent v2.0 — Development Phases

> Spec: `docs/superpowers/specs/2026-04-08-govent-v2-design.md`
> Each phase is independently deployable and demo-able.

---

## Phase 2.1 — Admin Core Completion ← START HERE

**Goal**: Make the admin panel actually complete and usable.

The v1.0 admin is broken in fundamental ways — you can create an event but never edit it, approve a registration with no feedback, and have no idea if an action worked. This phase fixes all of that.

| Feature | Description |
|---------|-------------|
| Block 1 | Event edit form (all fields) |
| Block 1 | Publish / Unpublish / Cancel action buttons |
| Block 3 | Global toast/snackbar system (Sonner) wired to all actions |
| Block 3 | Registrations table: auto-refresh after approve/reject |
| Block 3 | Registrations table: status filter counts ("PENDING (3)") |
| Block 3 | Registrations table: participant search (name/email) |
| Block 3 | Reject modal: reason required before confirming |
| Block 4 | Confirmation dialogs on: event cancel, blacklist add/remove |
| Block 6 | Audit log: filter by action type + event |
| Block 6 | Audit log: human-readable timestamps |
| Block 6 | Audit log: pagination (50/page, remove 200-row hard limit) |

**Schema changes**: None  
**New API endpoints**: None (all existing)  
**Plan file**: `docs/superpowers/plans/2026-04-08-v2.1-admin-core.md`

---

## Phase 2.2 — UI Overhaul + Public UX

**Goal**: Make both the admin and public-facing pages polished, clear, and government-appropriate.

| Feature | Description |
|---------|-------------|
| Feature J | Admin sidebar redesign with icons + active state |
| Feature J | Admin event detail: tab layout (Overview / Registrations / Check-in) |
| Feature J | Public event cards: better visual design, seat availability badge |
| Feature J | Mobile-responsive public pages (listing, detail, registration form) |
| Feature J | Loading skeletons on all data-loading pages |
| Block 2 | My Registrations: PENDING_PAYMENT badge + "Pay Now" button |
| Block 7 | Registration success screen: clear "what happens next" CTA |
| Block 7 | Real-time email eligibility check on registration form |
| Block 9 | Venue hiding: `venueHidden` field, revealed only to APPROVED |
| Feature D | Registration deadline countdown on event detail |
| Feature E | Capacity progress bar on event listing + detail |

**Schema changes**: `Event.venueHidden Boolean @default(false)`  
**New API endpoints**: None  
**Plan file**: `docs/superpowers/plans/2026-04-08-v2.2-ui-overhaul.md`

---

## Phase 2.3 — New Power Features

**Goal**: Add high-value features that go beyond the MVP scope — analytics, broadcast, CPD tracking, check-in resilience.

| Feature | Description |
|---------|-------------|
| Feature I | Admin analytics dashboard `/admin/analytics` (Recharts) |
| Feature C | Event broadcast notification (admin → APPROVED/WAITLISTED) |
| Feature A | CPD hours accumulation on My Registrations |
| Feature B | Admin internal notes on registrations |
| Block 5 | Check-in: camera error handling + Enter key on manual entry |
| Block 5 | Check-in: name/email search tab as alternative to QR |
| Feature H | Check-in: real-time stats panel (checked in / total) |
| Feature F | QR time-window validation (±2h from event start) |

**Schema changes**: `Registration.adminNotes String?`  
**New API endpoints**: `POST /api/events/[id]/broadcast`, `GET /api/analytics`, `GET /api/events/[id]/checkin-stats`  
**Plan file**: `docs/superpowers/plans/2026-04-08-v2.3-power-features.md`

---

## Phase 2.4 — Utility & Deployment Prep

**Goal**: Finish remaining utility features and prepare for NorthFlank deployment.

| Feature | Description |
|---------|-------------|
| Block 8 | CSV export of attendee list |
| Block 8 | Participant self-cancel (My Registrations) |
| Block 8 | Print QR code (My Registrations) |
| Block 8 | Bulk approve (select multiple PENDING → approve all) |
| — | NorthFlank deployment (Docker build, managed DB, env vars, Stripe webhook prod) |
| — | Finalise ARCHITECTURE.md and DATA_FLOW.md for submission |
| — | Complete "What I Would Do Differently" in BUILD_LOG.md |

**Schema changes**: None  
**New API endpoints**: `GET /api/registrations/[eventId]/export`  
**Plan file**: `docs/superpowers/plans/2026-04-08-v2.4-utility.md`

---

## Summary

| Phase | Focus | Schema | New APIs |
|-------|-------|--------|----------|
| **2.1** | Admin core completion | None | None |
| **2.2** | UI overhaul + public UX | `venueHidden` | None |
| **2.3** | New power features | `adminNotes` | 3 |
| **2.4** | Utility + deployment | None | 1 |
