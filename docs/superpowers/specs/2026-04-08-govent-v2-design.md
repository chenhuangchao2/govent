# GovEvent v2.0 — Design Spec

> **Status**: Planned — builds on v1.0-mvp (tagged 2026-04-08)
> **Scope**: Full UX pass + new features confirmed in brainstorming session

---

## What v2.0 Adds

v1.0 has all data flows wired end-to-end. v2.0 makes the system genuinely usable: every rough edge fixed, every missing UI surface added, plus several high-value features that go beyond the MVP.

---

## Block 1: Event Management Completeness

**Problem**: Admin can create events but cannot edit, publish, unpublish, or cancel them after creation.

**Changes:**
- Add **Edit Event** form on admin event detail page — all fields: title, description, venue (if not hidden), date/time, capacity, registration deadline, eligibility rules, price, CPD hours
- Add **Publish / Unpublish / Cancel** action buttons on admin event detail page — these hit existing `PATCH /api/events/[id]` endpoints which already work
- Cancelling an event triggers email notification to all APPROVED/WAITLISTED registrants
- Venue field gains a `venueHidden` boolean flag (see Block 9)

**API**: No new endpoints needed — `PATCH /api/events/[id]` with `action=publish/unpublish/cancel` and general field patch already exist.

---

## Block 2: Payment Visibility in My Registrations

**Problem**: Participants with PENDING_PAYMENT status see the same UI as PENDING. No payment deadline shown. Payment link only in email.

**Changes:**
- PENDING_PAYMENT registrations show distinct badge (amber, "Awaiting Payment")
- "Pay Now" button pulls `stripeSessionId` from registration record (stored as the Checkout URL)
- Payment deadline displayed as countdown (ties into Feature D)
- APPROVED registrations gained via payment show a success indicator

---

## Block 3: Admin Action Feedback Layer

**Problem**: Approve/reject fires silently. Table doesn't refresh. No toast system anywhere.

**Changes:**
- Global toast/snackbar system (shadcn/ui `Sonner` or `Toast`) wired to all server actions
- Registrations table auto-refreshes after every approve/reject/cancel action (optimistic update or `router.refresh()`)
- Status filter tabs show live counts: "PENDING (3)", "APPROVED (12)", etc.
- Participant search field (filter by name or email) on registrations table
- Reject action opens modal requiring rejection reason before confirming

---

## Block 4: Confirmation Dialogs on Destructive Actions

**Problem**: Blacklist add/remove, event cancel, participant cancel all fire immediately with no confirmation.

**Changes:**
- shadcn/ui `AlertDialog` on: event cancel, blacklist add, blacklist remove, registration cancel, bulk approve
- Dialog shows consequence summary: "This will notify 23 registered attendees."
- Confirmation requires explicit button click, not just "OK"

---

## Block 5: Check-In Reliability

**Problem**: Camera permission denied → blank video, no message. Manual fallback requires button click for each entry. No name/email search option.

**Changes:**
- Camera error state: detect permission denied / device not found, show clear error message with manual fallback prompt
- Manual check-in: Enter key submits registration ID (no button click required)
- Add name/email search tab alongside QR scanner — organiser types name/email, system shows matching APPROVED registrations with one-click check-in
- Real-time stats panel during check-in: checked in / total approved, live update on each scan (Feature H)

---

## Block 6: Audit Log Usability

**Problem**: 200-row hard limit, no filter, raw ISO timestamps.

**Changes:**
- Filter by: action type (dropdown), event (dropdown), date range
- Human-readable timestamps ("2 hours ago", "Apr 8, 2026 3:45 PM")
- Pagination: 50 rows per page with prev/next
- Remove 200-row hard limit

---

## Block 7: Registration Form UX

**Problem**: Success screen gives no guidance. No real-time eligibility preview. No Enter key support.

**Changes:**
- Success screen: shows what happens next based on event type (free: "Admin will review within 24h", paid: "You'll receive a payment link by email")
- Real-time eligibility check as user types email: green tick if eligible, warning if domain doesn't match
- Deadline countdown on event detail page (Feature D)
- Capacity progress bar on event detail page ("42/60 seats filled") — Feature E

---

## Block 8: Admin Utility Features

**Problem**: No bulk operations, no data export, participant has no self-service cancel.

**Changes:**
- **CSV export**: Download attendee list for any event (columns: name, email, department, status, check-in time, CPD hours)
- **Participant self-cancel**: Participants can cancel their own registration from My Registrations before the event (with confirmation dialog)
- **Print QR**: Print-friendly view of QR code from My Registrations page
- **Bulk approve**: Select multiple PENDING registrations → approve all (with confirmation dialog showing count)

---

## Block 9 (NEW): Venue Hiding

**Problem**: Venue should be revealed only after approval to prevent unregistered attendance or security concerns at government facilities.

**Schema change**: Add `venueHidden: Boolean @default(false)` to `Event` model.

**Behaviour:**
- If `venueHidden = true`: public event listing and detail page show "Venue revealed upon approval"
- APPROVED registrants see venue in My Registrations and in their approval email
- WAITLISTED registrants do not see venue until promoted to APPROVED
- Admin always sees the full venue

**Admin**: Toggle on event create/edit form. Default off.

---

## Feature A: CPD Hours Dashboard (Participant-Facing)

**Problem**: Participants can't see their accumulated CPD hours across events.

**Where**: My Registrations page — add summary section at top: "Total CPD Hours: 12.5 hrs" broken down by event (only ATTENDED registrations count).

**No new API needed**: CPD hours already stored on Event, registration status already tracked.

---

## Feature B: Admin Internal Notes on Registrations

**Problem**: Admin has no way to add notes to a registration (e.g., "VIP guest", "exemption granted", "follow up needed").

**Schema change**: Add `adminNotes: String?` to `Registration` model.

**Where**: Registration row in admin table — expandable notes field, save inline. Not visible to participant.

**New API**: `PATCH /api/registrations/[id]` with `action=add-note`.

---

## Feature C: Event Broadcast Notification

**Problem**: Admin cannot message all registered attendees — e.g., "Room changed to LT2", "Event postponed".

**Where**: Admin event detail page — "Send Broadcast" button → modal with subject + message body → sends Resend email to all APPROVED + WAITLISTED registrants.

**New API**: `POST /api/events/[id]/broadcast` — requires admin session.

**Audit**: Broadcast logged to AuditLog with message preview.

---

## Feature D: Registration Deadline Countdown

**Problem**: Participants don't see urgency when deadline is approaching.

**Where**: Event detail page (public) — countdown timer next to registration CTA: "Registration closes in 2d 4h 30m". Switches to "Registration closed" when past deadline. Client-side, no API call.

---

## Feature E: Capacity Progress Bar

**Problem**: Participants don't see how full an event is.

**Where**: Event listing cards and event detail page. Visual bar: "42 / 60 seats" with colour: green (<70%), amber (70–90%), red (>90%). For waitlisted events: shows "Waitlist open".

**Data**: Already available in event listing API response (`_count.registrations` vs `capacity`).

---

## Feature F: QR Code Time-Window Validation

**Problem**: QR codes work at any time — could be scanned days later or before the event.

**Change**: Check-in API validates that current time is within ±2 hours of event `startTime`. Outside the window: returns error "Check-in not open yet" or "Event has ended".

**API change**: `POST /api/checkin` adds time window check before updating registration status.

---

## Feature H: Check-In Real-Time Stats Panel

**Problem**: Organiser running check-in has no visibility into arrival rate.

**Where**: Check-in page — sidebar panel showing:
- Checked in: X / Y approved
- Still expected: Z
- Progress bar
- Last 5 check-ins (name + timestamp)

**Data**: Polled every 10s from existing check-in endpoint data, or a new `GET /api/events/[id]/checkin-stats` endpoint.

---

## Feature I: Admin Analytics & Reporting Dashboard

**Problem**: Admin has no overview of registration trends, event performance, or participant engagement.

**Where**: New admin page `/admin/analytics` — linked from sidebar.

**Visualizations** (using Recharts or similar):
- Event capacity fill rate — bar chart across all events (registered / capacity %)
- Registration status breakdown — pie chart (APPROVED / REJECTED / WAITLISTED / NO_SHOW)
- Check-in rate trend — line chart over time
- Top events by registration count
- Department breakdown — which departments are most active
- CPD hours issued — total across all events

**Data**: All from existing DB — no new schema changes needed. New API: `GET /api/analytics` returning aggregated stats.

---

## Feature J: Full UI Overhaul

**Problem**: Current UI is functional but not polished — unclear visual hierarchy, inconsistent spacing, poor contrast, admin sidebar not intuitive.

**Changes:**
- Redesign admin layout: clearer sidebar with icons + labels, active state highlighting
- Event cards on public listing: better visual design with status badges, seat availability, date/time prominently shown
- Registration form: step-by-step layout with progress indicator
- Admin event detail: tab layout (Overview / Registrations / Check-in / Broadcast) instead of scroll
- Consistent use of shadcn/ui components throughout
- Color system: government-appropriate (blues/greys), not generic
- Mobile-responsive public pages (admin can remain desktop-only)
- Loading skeletons instead of blank flashes on data load

---

## Schema Changes Required

| Change | Model | Field |
|--------|-------|-------|
| Venue hiding | `Event` | `venueHidden Boolean @default(false)` |
| Admin notes | `Registration` | `adminNotes String?` |

---

## New API Endpoints Required

| Endpoint | Purpose |
|----------|---------|
| `POST /api/events/[id]/broadcast` | Send email to all APPROVED/WAITLISTED registrants |
| `GET /api/analytics` | Aggregated stats for analytics dashboard |
| `GET /api/events/[id]/checkin-stats` | Real-time check-in progress for Feature H |
| `GET /api/registrations/[eventId]/export` | CSV download of attendee list |

---

## Priority Order

1. **Block 1** — Event edit + publish/cancel (core flow gap)
2. **Block 3** — Toast + auto-refresh + table UX (every demo scenario)
3. **Feature J** — UI overhaul (first impression)
4. **Block 2** — Payment visibility (participant-facing gap)
5. **Block 9** — Venue hiding (government-appropriate feature)
6. **Feature I** — Analytics dashboard (impressive demo feature)
7. **Block 5** — Check-in reliability (event-day critical)
8. **Block 6** — Audit log usability (admin polish)
9. **Feature C** — Broadcast notification (high-value admin tool)
10. **Feature A** — CPD dashboard (participant engagement)
11. **Block 4** — Confirmation dialogs (safety layer)
12. **Block 7** — Registration form UX (onboarding polish)
13. **Feature B** — Admin notes (power user feature)
14. **Features D, E, F** — Countdown, progress bar, QR time-window (polish)
15. **Block 8** — CSV, self-cancel, print QR, bulk approve (utility)
16. **Feature H** — Check-in stats panel (live event ops)
