# GovEvent v2.0 — Development Phases

> Spec: `docs/superpowers/specs/2026-04-08-govent-v2-design.md`
> Each phase is independently deployable and demo-able.

---

## Phase 2.1 — Admin Core Completion ✅ COMPLETE (2026-04-08)

**Goal**: Make the admin panel actually complete and usable.

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

---

## Phase 2.2 — UI Overhaul + Public UX ✅ COMPLETE (2026-04-08)

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
| Feature D | Registration deadline countdown on event detail |
| Feature E | Capacity progress bar on event listing + detail |

**Schema changes**: `Event.venueHidden Boolean @default(false)`
**New API endpoints**: None

---

## Phase 2.3 — Power Features ✅ COMPLETE (2026-04-08)

**Goal**: Add high-value features — analytics, broadcast, check-in resilience, bulk operations.

| Feature | Description |
|---------|-------------|
| Feature I | Admin analytics dashboard on main dashboard (Recharts: status pie, fill rates, org breakdown, upcoming schedule) |
| Feature C | Event broadcast notification (admin → APPROVED/WAITLISTED via Resend) |
| Feature B | Admin internal notes on registrations (auto-save) |
| Block 5 | Check-in: tabbed layout (QR Scanner / Search / Manual ID) |
| Block 5 | Check-in: name/email search with one-click check-in |
| Block 5 | Check-in: camera error handling + Enter key support |
| Feature H | Check-in: real-time stats panel with 10s polling |
| Feature F | QR time-window validation (±2h from event start/end) |
| Block 8 | CSV export of attendee list |
| Block 8 | Bulk approve (select PENDING → batch approve with confirmation) |
| Block 8 | Participant self-cancel (My Registrations) |

**Schema changes**: `Registration.adminNotes String?`
**New API endpoints**: `POST /api/events/[id]/broadcast`, `GET /api/analytics`, `GET /api/events/[id]/checkin-stats`, `GET /api/registrations/export`, `POST /api/registrations/bulk-approve`, `POST /api/registrations/self-cancel`

---

## Phase 2.4 — Auth, UX Polish & Data Cleanup ✅ COMPLETE (2026-04-08)

**Goal**: Add participant authentication, polish UX, fix data model issues.

| Feature | Description |
|---------|-------------|
| Participant Auth | Email + password signup with OTP verification (Resend) |
| Participant Auth | Login/logout with iron-session (separate cookie from admin) |
| Participant Auth | Auth-aware nav: Sign In/Up for guests, Hi {name} + Sign Out for users |
| Participant Auth | My Registrations requires login, auto-loads from session |
| Participant Auth | Registration form pre-fills from session if logged in |
| Data Model | `department` → `organisation` rename (full stack: schema, API, UI, seed) |
| Data Model | `venueHidden` removed — always show venue, TBC if empty |
| Data Model | `Participant` model added to schema |
| UX | Event listing filters: search + time + cost + organisation |
| UX | Re-registration allowed after CANCELLED/REJECTED |
| UX | EventOverview: tags editor with chips (add/remove), checkbox auto-save |
| UX | Eligibility display: shows Organisation not domain |
| Fixes | Stripe `expires_at` max 24h, Stripe URL fix, API error handling |
| Seed | 7 realistic events with Singapore government context |

**Schema changes**: `Participant` model, `Registration.department` → `organisation`, `Event.allowedDepartments` → `allowedOrganisations`
**New API endpoints**: `POST /api/auth/participant/{signup,verify,login,logout}`, `GET /api/auth/participant/me`

---

## Summary

| Phase | Focus | Status | Key Deliverables |
|-------|-------|--------|------------------|
| **2.1** | Admin core completion | ✅ | Event edit, toast system, registrations table, audit log |
| **2.2** | UI overhaul + public UX | ✅ | Responsive design, loading skeletons, capacity bar, countdown |
| **2.3** | Power features | ✅ | Analytics, broadcast, check-in upgrade, CSV, bulk approve |
| **2.4** | Auth + UX polish | ✅ | Participant auth, org rename, event filters, re-registration |
