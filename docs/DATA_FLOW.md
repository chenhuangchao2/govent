# Data Flow Reference — GovEvent

> Walkthrough preparation material — covers all data flows end-to-end.
> Updated through v5.0 (complete UI rebuild + featured events + certificates).

---

## Flow 1: Participant Submits Registration

**User action**: Fills registration form and clicks Submit

```
Browser (Client Component)
  │  POST /api/registrations
  │  Body: { eventId, name, email, organisation, remarks }
  ▼
API Route: /api/registrations
  1. Check blacklist          → if found: return 403 "Please contact the organiser"
  2. Check eligibility rules  → if fails: return 400 with specific reason
  3. Check registration deadline → if passed: return 400 "Registration closed"
  4. BEGIN Prisma transaction
     a. SELECT event with capacity + current registration count (FOR UPDATE)
     b. if count >= capacity → create Registration { status: WAITLISTED, position: count+1 }
     c. else                 → create Registration { status: PENDING }
     d. create AuditLog entry
  5. COMMIT transaction
  6. call services/email.ts → Resend API (confirmation email)
  │
  ▼
Response: { data: { registration, status } }
  │
  ▼
UI: Rich success screen — status badge, "What happens next" card (free/paid/waitlisted), CTA to My Registrations
```

**English walkthrough script**:
> "When a participant submits the form, the API runs four checks in order before touching the database — blacklist, eligibility, deadline, then capacity. The capacity check uses a database transaction to prevent two people from grabbing the last seat simultaneously. Once saved, Resend sends a confirmation email automatically. Before submission, the form shows a real-time eligibility preview — the participant's email domain is checked client-side against the event's allowedDomains list."

---

## Flow 2: Organiser Approves a Registration

**User action**: Clicks "Approve" on a PENDING registration

```
Browser
  │  PATCH /api/registrations/[id]
  │  Body: { action: "APPROVE" }
  ▼
API Route
  1. Verify admin session
  2. Fetch registration + event
  3. Validate status transition (must be PENDING)
  4. if event.isPaid:
       a. call services/stripe.ts → Stripe API: create Checkout Session
       b. update Registration { status: PENDING_PAYMENT, stripeSessionId }
       c. email: payment link + deadline
     else:
       a. update Registration { status: APPROVED }
       b. generate QR code (encode registrationId)
       c. email: approval confirmation + QR code attachment
  5. create AuditLog { action: "APPROVE", actorId, registrationId }
  │
  ▼
Response: { data: updatedRegistration }
  │
  ▼
UI: Status badge updates inline, toast notification confirms action, table auto-refreshes
```

---

## Flow 3: Stripe Payment (Paid Events)

**User action**: Participant clicks payment link, completes Stripe Checkout

```
Stripe hosted page (external)
  │  User completes payment
  │
  ▼
Stripe → POST /api/webhook/stripe
  Body: Stripe event payload (signed)
  │
API Route
  1. Verify Stripe webhook signature (STRIPE_WEBHOOK_SECRET)
     → if invalid: return 400 immediately
  2. Check event type: "checkout.session.completed"
  3. Retrieve registrationId from session metadata
  4. Update Registration { status: APPROVED, paymentStatus: PAID }
  5. Generate QR code
  6. call services/email.ts → send approval email + QR code
  7. create AuditLog { action: "PAYMENT_CONFIRMED" }
  │
  ▼
Response: 200 OK (Stripe requires fast acknowledgement)
```

**English walkthrough script**:
> "The payment flow is entirely event-driven. When Stripe receives the payment, it sends a webhook to our server. We verify the signature to confirm it's genuine, then update the registration to APPROVED and send the QR code. Our server never sees the card details — Stripe handles all of that."

---

## Flow 4: Waitlist Auto-Promotion

**Trigger**: A registration is cancelled or rejected

```
PATCH /api/registrations/[id] → status = REJECTED or CANCELLED
  │
  ▼
After status update:
  1. Query: find first WAITLISTED registration for same event (ORDER BY createdAt ASC)
  2. if found:
       a. update → status: PENDING
       b. update waitlist positions for remaining entries
       c. email: "A spot has opened — you have 24h to confirm attendance"
       d. create AuditLog { action: "WAITLIST_PROMOTED" }
  │
  ▼
Candidate receives email with link to confirm or decline
```

---

## Flow 5: QR Code Check-in

**User action**: Organiser scans participant's QR code at event entrance

```
Browser (full-screen check-in page, Client Component)
  │  Camera API reads QR → decodes registrationId
  │  POST /api/registrations/[id]/checkin
  ▼
API Route
  1. Verify admin session
  2. Fetch registration
  3. Validate:
     - status must be APPROVED         → else: "Not approved for this event"
     - eventId must match current event → else: "Wrong event"
     - status must not be ATTENDED     → else: "Already checked in at HH:MM"
  4. Update Registration { status: ATTENDED, checkedInAt: now() }
  5. create AuditLog { action: "CHECKIN" }
  │
  ▼
Response: { data: { name, checkedInAt } }
  │
  ▼
UI: Green flash + participant name displayed for 2 seconds
```

---

## Flow 6: Scheduled Jobs (NorthFlank Cron → hourly)

### 6a: T-48h Reminder Emails
```
NorthFlank Cron (every hour)
  │  GET /api/cron/reminders
  │  Header: { x-cron-secret: CRON_SECRET }
  ▼
  1. Query: events where startTime BETWEEN now+47h AND now+49h
  2. For each event: find registrations where status=APPROVED AND reminderSent=false
  3. For each registration: call Resend → send reminder email
  4. Update registrations: reminderSent = true
  (idempotent: reminderSent flag prevents duplicate sends)
```

### 6b: Payment Timeout Cleanup
```
NorthFlank Cron (every hour)
  │  GET /api/cron/payment-timeout
  ▼
  1. Query: registrations where status=PENDING_PAYMENT AND paymentDeadline < now()
  2. For each: update status = PAYMENT_FAILED
  3. Trigger waitlist promotion (same as Flow 4)
  4. Increment no-show count on Blacklist record
  5. AuditLog entry
```

### 6c: Post-Event NO_SHOW Marking
```
NorthFlank Cron (every hour)
  │  GET /api/cron/no-shows
  ▼
  1. Query: events where endTime < now() AND noShowProcessed = false
  2. For each event: find registrations where status=APPROVED (not ATTENDED)
  3. Update those registrations: status = NO_SHOW
  4. Increment no-show count on Blacklist record for each participant
  5. Check: if noShowCount >= 5 → activate Blacklist entry, send notification email
  6. Update event: noShowProcessed = true
```

---

## Flow 7: Resend Email Service

All emails go through `services/email.ts` which wraps the Resend API:

```typescript
// Pattern used across all flows
await resend.emails.send({
  from: "noreply@govcalendar.gov.sg",
  to: participant.email,
  subject: "...",
  html: "..."
})
```

Failure handling: email errors are logged but do not roll back the main transaction (email is best-effort; the registration state change is the source of truth).

---

## Flow 8: Admin Login / Logout

**Login**: Admin enters email + password on `/admin/login`

```
Browser
  │  POST /api/auth/login
  │  Body: { email, password }
  ▼
API Route
  1. Hash password with SHA-256
  2. Query User by email + passwordHash
  3. if not found → return 401
  4. Create iron-session: { userId, userEmail, userName, isLoggedIn: true }
  │
  ▼
Response: { data: { name, email } }
  → Redirect to /admin
```

**Logout**: Admin clicks "Sign out" in sidebar

```
Browser
  │  POST /api/auth/logout (form submission)
  ▼
API Route
  1. Get iron-session
  2. session.destroy()
  3. Redirect 307 → /admin/login
```

---

## Flow 9: Admin Inline Edit (Event Overview)

**User action**: Admin clicks a field on the event Overview tab

```
Browser (EventOverview client component)
  │  Click field → inline input appears
  │  Edit value → press Enter or click Save
  │  PATCH /api/events/[id]
  │  Body: { [fieldName]: newValue }
  ▼
API Route
  1. Verify admin session
  2. Update event record (single field)
  3. Create AuditLog { action: "EDIT_EVENT" }
  │
  ▼
Response: { data: updatedEvent }
  │
  ▼
UI: Toast "Title updated", router.refresh() reloads server data
```

---

## Flow 10: Venue Hiding

**Context**: Government events may need to hide the venue until a participant is approved (security-sensitive locations).

```
Event.venueHidden = true (set by admin on create/edit)
  │
  ▼
Public pages (/events, /events/[id]):
  → Show "Venue revealed upon approval" (italic placeholder)

My Registrations (/my-registrations):
  → APPROVED registrations: show actual venue
  → All other statuses: show "Venue details available after approval"

Admin pages:
  → Always show full venue (admin has full access)
```

No API change needed — `venueHidden` is a field on Event, checked in UI rendering logic only.

---

## Flow 11: My Registrations — Payment + CPD

**User action**: Participant looks up their registrations by email

```
Browser ('use client' page)
  │  GET /api/my-registrations?email=user@gov.sg
  ▼
API Route
  1. Query registrations by email
  2. Include event details (title, startTime, venue, venueHidden, cpdHours, isPaid)
  3. Include stripeSessionId for payment link
  │
  ▼
Response: { data: Registration[] }
  │
  ▼
UI renders:
  - CPD summary: total hours across ATTENDED registrations (if > 0)
  - Per registration card:
    - PENDING_PAYMENT → "Pay Now →" button (opens stripeSessionId URL)
    - APPROVED → venue + QR code
    - WAITLISTED → position number
    - ATTENDED → checkmark + CPD hours earned
```

---

## API Route Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Admin login (iron-session) |
| POST | `/api/auth/logout` | Admin logout (destroy session, redirect) |
| POST | `/api/auth/participant/signup` | Participant signup (email + password → OTP sent) |
| POST | `/api/auth/participant/verify` | Verify OTP code, create session |
| POST | `/api/auth/participant/login` | Participant login (email + password) |
| POST | `/api/auth/participant/logout` | Participant logout (destroy session) |
| GET | `/api/auth/participant/me` | Get current participant session info |
| POST | `/api/auth/participant/reset-password` | Password reset (OTP-based, two-step) |
| GET | `/api/events` | List published events |
| GET | `/api/events/[id]` | Get single event detail |
| POST | `/api/events` | Create event (admin) |
| PATCH | `/api/events/[id]` | Edit / publish / cancel event (admin) |
| POST | `/api/events/[id]/broadcast` | Email broadcast to APPROVED/WAITLISTED (admin) |
| GET | `/api/events/[id]/checkin-stats` | Live check-in progress for polling (admin) |
| GET | `/api/registrations` | List registrations (admin, filterable) |
| POST | `/api/registrations` | Submit registration (participant) |
| PATCH | `/api/registrations/[id]` | Approve / reject / cancel / add-note (admin) |
| POST | `/api/registrations/[id]/checkin` | Mark attended with ±2h time-window (admin) |
| POST | `/api/registrations/bulk-approve` | Batch approve PENDING registrations (admin) |
| POST | `/api/registrations/self-cancel` | Participant self-cancel (session-verified) |
| GET | `/api/registrations/export` | CSV download of attendee list (admin) |
| GET | `/api/my-registrations` | Participant registrations (session-authenticated) |
| GET | `/api/analytics` | Aggregated stats for admin dashboard |
| GET | `/api/audit` | Audit log entries (admin, filterable, paginated) |
| GET | `/api/blacklist` | List blacklist (admin) |
| POST | `/api/blacklist` | Manual add (admin) |
| DELETE | `/api/blacklist/[id]` | Remove entry (admin) |
| POST | `/api/webhook/stripe` | Stripe payment webhook (signature-verified) |
| GET | `/api/cron/reminders` | T-48h reminder job (CRON_SECRET) |
| GET | `/api/cron/payment-timeout` | Payment expiry cleanup (CRON_SECRET) |
| GET | `/api/cron/no-shows` | Post-event NO_SHOW marking (CRON_SECRET) |
