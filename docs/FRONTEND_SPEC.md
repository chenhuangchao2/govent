# Frontend Specification — GovEvent

> This document describes ALL frontend pages, their logic, data sources, and API connections.
> It contains NO visual/styling information. Use this + design_reference to rebuild the UI.

---

## Architecture Overview

- **Framework**: Next.js 15 App Router, TypeScript
- **Rendering**: Server Components by default, `'use client'` only for interactive parts
- **Auth**: Two separate iron-session cookies — `govent-session` (admin), `govent-participant` (participant)
- **API**: All endpoints under `/api/`, return `{ data, error }` format
- **State**: Local component state only (no Redux/Context)

---

## Public Pages

### P1. Root `/`
- Server Component. Redirects to `/events`.

### P2. Events Listing `/events`
- **Type**: Server Component (ISR 30s)
- **Data**: `db.event.findMany({ isPublished: true, isCancelled: false })` with registration counts, ordered by startTime asc
- **Logic**:
  - Split events into: `featured` (nearest future), `secondary` (2nd future), `gridEvents` (all)
  - Pass `gridEvents` to interactive filter component
- **Sections**:
  1. **Header**: Page title + search input
  2. **Featured**: 8:4 asymmetric grid — large image card (featured event) + side card (secondary event)
  3. **Event Grid**: Filter pills (Time/Topic/Org/Free) + 3-col card grid. Every 3rd card = highlight style
  4. **CPD Section**: Static placeholder for future CPD hours tracking
- **Links**: Each event card → `/events/{id}`

### P3. Event Detail `/events/[id]`
- **Type**: Server Component
- **Data**: `db.event.findUnique({ id, isPublished: true, isCancelled: false })` with registration count
- **Computed**: `registered`, `available`, `isFull`, `isPastDeadline`, formatted date/time
- **Sections**:
  1. Back link → `/events`
  2. Title + FREE/PAID badge
  3. Info cards: Date/Time, Venue, Capacity (CapacityBar), CPD Hours (if >0), Price (if paid), Eligibility (if org-restricted)
  4. Deadline countdown (live, updates every 1s)
  5. Description
  6. Registration CTA (EventRegistrationStatus — see below)
- **EventRegistrationStatus logic**:
  - Fetches `/api/auth/participant/me` + `/api/my-registrations`
  - If registered: show status badge + link to `/my-registrations`
  - If not registered + not past deadline + not full: "Register Now" → `/register/{id}`
  - If not registered + not past deadline + full: "Join Waitlist" → `/register/{id}`
  - If past deadline: "Registration has closed"
  - If not logged in: "Sign in" prompt with redirect

### P4. Registration Form `/register/[id]`
- **Type**: Server Component (page) + Client Component (form)
- **Page data**: `db.event.findUnique({ id, isPublished: true, isCancelled: false })`
- **Form logic** (client):
  - On mount: fetch `/api/auth/participant/me` for pre-fill (name, email, organisation)
  - Fields: name (required), email (required, read-only if logged in), organisation (required), remarks (optional)
  - Real-time eligibility hint: checks email domain against `allowedDomains`
  - Submit: POST `/api/registrations`
  - Success screen: status badge, context-aware "what happens next" text, CTA to my-registrations or signup
- **Links**: `/login?redirect=/register/{id}`, `/my-registrations`, `/signup`, `/events`

### P5. My Registrations `/my-registrations`
- **Type**: Client Component
- **Data**: fetch `/api/auth/participant/me`, then `/api/my-registrations`
- **Auth**: Shows login prompt if not authenticated
- **Display**:
  - CPD hours summary (total from ATTENDED events)
  - Split into Upcoming / Past sections
  - Each registration card shows:
    - Event title (link to `/events/{id}`), date/time, venue, status badge
    - APPROVED: QR code (with print), venue
    - PENDING_PAYMENT: "Pay Now" button (Stripe URL) + payment deadline
    - WAITLISTED: position number
    - ATTENDED: CPD hours earned
    - Active statuses: "Cancel Registration" button (SelfCancelButton)
- **SelfCancelButton**: POST `/api/registrations/self-cancel` with confirmation dialog

### P6. Login `/login`
- **Type**: Client Component
- **Fields**: email, password
- **Submit**: POST `/api/auth/participant/login`
- **Success**: redirect to `?redirect` param or `/my-registrations`
- **Links**: `/forgot-password`, `/signup`

### P7. Signup `/signup`
- **Type**: Client Component, 2-step flow
- **Step 1**: name, organisation, email, password, confirmPassword
  - Submit: POST `/api/auth/participant/signup`
  - Validation: password >= 6 chars, passwords match
- **Step 2**: 6-digit OTP code with countdown timer (10 min)
  - Submit: POST `/api/auth/participant/verify`
  - Resend: re-POST signup endpoint
  - Success: redirect to `/my-registrations`
- **Links**: `/login`

### P8. Forgot Password `/forgot-password`
- **Type**: Client Component, 2-step flow
- **Step 1**: email → POST `/api/auth/participant/reset-password` (action: send-code)
- **Step 2**: code + newPassword + confirmPassword → POST same endpoint (action: reset)
- **Success**: redirect to `/login`
- **Links**: `/login`

### P9. Public Layout (wraps all public pages)
- Background accent layers (decorative glows)
- PublicNav: fixed floating nav bar
  - Logo "GovEvent" → `/events`
  - "Events" link (always visible)
  - "My Registrations" link (logged in only)
  - "Sign In" / "Sign Up" buttons (guest) or name + "Sign Out" (logged in)
  - Auth: fetches `/api/auth/participant/me` on mount
  - Logout: POST `/api/auth/participant/logout`
  - Mobile: hamburger menu
- Footer: "© 2026 GovEvent"

---

## Admin Pages

### A1. Admin Login `/admin/login`
- **Type**: Client Component
- **Fields**: email, password
- **Submit**: POST `/api/auth/login`
- **Success**: redirect to `/admin`
- **Note**: "Forgot password? Contact your system administrator." text

### A2. Admin Layout (wraps all `/admin/*` except login)
- **Auth**: Server-side `requireAdmin()`, redirect to `/admin/login` if not authenticated
- **Sidebar**: Dashboard, Events, Accounts (Super Admin only), Blacklist, Audit Log
  - Active link highlighting based on current path
  - Sign Out: form POST to `/api/auth/logout`
  - Receives `isSuperAdmin` prop from layout

### A3. Dashboard `/admin`
- **Type**: Server Component
- **Data** (parallel queries):
  - Active events count (published, not cancelled)
  - Pending approvals count (status=PENDING)
  - Today's check-ins count (status=ATTENDED, checkedInAt >= today)
  - Total registrations count
- **Sections**:
  1. 4 stat cards (icons + numbers)
  2. AnalyticsDashboard (client component, fetches `/api/analytics`):
     - Registration status pie chart
     - Popular topics bar chart (top 5)
     - Upcoming events grid with fill rate

### A4. Events List `/admin/events`
- **Type**: Server Component
- **Data**: `db.event.findMany()` — Super Admin sees all, regular admin sees own events only
- **Display**: Table with title (link), date, capacity (color-coded), status badge (Published/Draft/Cancelled), creator (Super Admin only)
- **Actions**: "+ New Event" button → `/admin/events/new`
- **Empty state**: "Create your first event" link

### A5. Create Event `/admin/events/new`
- **Type**: Client Component (EventForm)
- **Fields**: title, description, startTime, endTime, venue, venueHidden, capacity, registrationDeadline, imageUrl, tags (8 presets), allowedDomains, allowedOrganisations, cpdHours, isPaid, price
- **Validation**: Real-time date warnings (end < start, deadline > start), submit disabled if errors
- **Submit**: POST `/api/events` then PATCH to publish
- **Success**: redirect to `/admin/events/{id}`

### A6. Event Detail `/admin/events/[id]`
- **Type**: Server Component (page) + Client Components (tabs)
- **Auth**: `requireAdmin()` + ownership check (creatorId or isSuperAdmin)
- **Header**: Title, status badge, date/venue, BroadcastModal button, EventActionButtons (Publish/Unpublish/Cancel)
- **3 Tabs**:

**Tab 1 — Overview (EventOverview)**:
- Click-to-edit inline fields: title, description, venue, startTime, endTime, capacity, registrationDeadline, imageUrl, tags, allowedDomains, allowedOrganisations, cpdHours, isPaid, price
- Enter to save, Escape to cancel
- Tags: type + Enter/comma to add, backspace to remove
- All disabled if event cancelled
- Saves: PATCH `/api/events/{id}`

**Tab 2 — Registrations (RegistrationsPanel)**:
- Fetches: GET `/api/registrations?eventId={id}`
- Search by name/email, filter by status (with counts)
- Table: name/email, organisation, status badge, date, action buttons
- Actions per status:
  - PENDING: Approve / Reject (with reason modal)
  - APPROVED: Resend email / Cancel
  - PENDING_PAYMENT: Mark paid / Cancel
  - WAITLISTED: Cancel
- Bulk: "Select All Pending" → BulkApproveBar (POST `/api/registrations/bulk-approve`)
- Export: CsvExportButton (GET `/api/registrations/export?eventId={id}`)

**Tab 3 — Check-in (CheckinScanner)**:
- Two sub-tabs: QR Scanner / Search
- QR: camera starts on explicit click, scans registration ID, POST `/api/registrations/{id}/checkin`
- Search: loads APPROVED registrations, search by name/email, "Check In" button per row
- Right sidebar: CheckInStatsPanel (polls `/api/events/{id}/checkin-stats` every 10s)
- Time window: ±2h from event start/end enforced by API

### A7. Blacklist `/admin/blacklist`
- **Type**: Server Component (page) + Client Component (BlacklistTable)
- **Data**: `db.blacklist.findMany()` ordered by addedAt desc
- **Add**: email + reason fields, confirmation dialog, POST `/api/blacklist`
- **Remove**: per-row button, confirmation dialog, DELETE `/api/blacklist/{id}`
- **Display**: email, reason, source (MANUAL/AUTO_NO_SHOW/AUTO_PAYMENT), no-show count, date

### A8. Audit Log `/admin/audit-log`
- **Type**: Server Component with URL-based filters
- **Data**: `db.auditLog.findMany()` with optional filters (action, eventId, period), 50/page
- **Filters**: Period (Today/7d/30d/All), Action type, Event — each updates URL params
- **Display**: Card-based list grouped by date, color-coded action badges, actor name, metadata, relative time
- **Pagination**: Previous/Next links

### A9. Accounts `/admin/accounts` (Super Admin only)
- **Type**: Server Component (page) + Client Component (AccountsPanel)
- **Auth**: Redirects non-Super-Admin to `/admin`
- **Data**: `db.user.findMany()` with event counts
- **Display**: Table with name (+ "You" badge), email, role badge, event count, joined date
- **Add Admin**: Dialog with name/email/password → POST `/api/admin/accounts`
- **Reset Password**: Per-row button (except self) → PATCH `/api/admin/accounts`

---

## API Endpoints Summary

### Public
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/events` | List published events |
| GET | `/api/events/[id]` | Single event detail |
| POST | `/api/registrations` | Submit registration |
| POST | `/api/auth/participant/signup` | Participant signup |
| POST | `/api/auth/participant/verify` | Verify OTP |
| POST | `/api/auth/participant/login` | Participant login |
| POST | `/api/auth/participant/logout` | Participant logout |
| GET | `/api/auth/participant/me` | Current participant info |
| POST | `/api/auth/participant/reset-password` | Send code / reset |

### Participant (logged in)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/my-registrations` | User's registrations |
| POST | `/api/registrations/self-cancel` | Cancel own registration |

### Admin
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/logout` | Admin logout |
| POST | `/api/events` | Create event |
| PATCH | `/api/events/[id]` | Edit/publish/unpublish/cancel event |
| POST | `/api/events/[id]/broadcast` | Email all attendees |
| GET | `/api/events/[id]/checkin-stats` | Live check-in stats |
| GET | `/api/registrations` | List registrations (filterable) |
| PATCH | `/api/registrations/[id]` | Approve/reject/cancel/mark-paid/add-note/resend |
| POST | `/api/registrations/[id]/checkin` | Check in attendee |
| POST | `/api/registrations/bulk-approve` | Bulk approve |
| GET | `/api/registrations/export` | CSV download |
| GET/POST/PATCH | `/api/admin/accounts` | Manage admin accounts (Super Admin) |
| GET/POST | `/api/blacklist` | List/add blacklist |
| DELETE | `/api/blacklist/[id]` | Remove blacklist |
| GET | `/api/audit` | Audit log entries |
| GET | `/api/analytics` | Dashboard analytics |

### Webhooks & Cron
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/webhook/stripe` | Stripe payment confirmation |
| GET | `/api/cron/reminders` | T-48h reminder emails |
| GET | `/api/cron/payment-timeout` | Expire unpaid registrations |
| GET | `/api/cron/no-shows` | Mark no-shows post-event |

---

## Services (backend, not deleted)

| Service | File | Purpose |
|---------|------|---------|
| Email | `services/email.ts` | 9 email functions via Resend (all try-catch wrapped) |
| Stripe | `services/stripe.ts` | Create checkout session, SGD currency |
| Blacklist | `services/blacklist.ts` | Check + auto-activate at 5 no-shows |
| Waitlist | `services/waitlist.ts` | Transactional promote + renumber |
| QR | `services/qr.ts` | Generate QR data URL (300x300) |

## Lib (backend, not deleted)

| Lib | File | Purpose |
|-----|------|---------|
| Auth | `lib/auth.ts` | Admin session (iron-session, `govent-session` cookie) |
| Participant Auth | `lib/participant-auth.ts` | Participant session (`govent-participant` cookie) |
| Audit | `lib/audit.ts` | Create immutable audit log entries |
| DB | `lib/db.ts` | Prisma singleton client |
| Utils | `lib/utils.ts` | Date formatting utilities |
