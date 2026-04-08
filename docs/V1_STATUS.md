# GovEvent v1.0-mvp — Status & Known Gaps

> Tagged: `v1.0-mvp` · Date: 2026-04-08
> This is the first working version. All core flows are wired end-to-end but the UX is rough and several features visible in the API have no UI surface yet. v2.0 will address these gaps.

---

## What v1.0 Delivers

### Public Flows
| Flow | Status | Notes |
|------|--------|-------|
| Browse events (listing + detail) | ✅ Working | Seat counter, eligibility label, price shown |
| Submit registration | ✅ Working | Eligibility + blacklist + deadline + capacity checks |
| View my registrations + QR code | ✅ Working | Email-based lookup; QR shown for APPROVED |
| Waitlisted registration | ✅ Working | Position shown; auto-promotion on server |

### Admin Flows
| Flow | Status | Notes |
|------|--------|-------|
| Login / logout | ✅ Working | Session-based, `admin@govtech.gov.sg / admin123` |
| Dashboard stats | ✅ Working | Active events, pending approvals, today's check-ins |
| View all events | ✅ Working | Status badge, link to manage + check-in |
| Create event | ✅ Working | Auto-publishes after creation |
| Approve registration (free event) | ✅ Working | QR email sent to participant |
| Approve registration (paid event) | ✅ Working | Stripe Checkout session created, payment link emailed |
| Reject registration | ✅ Working | Reason required; waitlist promoted |
| QR code check-in | ✅ Working | Camera scan + manual ID fallback |
| Audit log | ✅ Working | Timeline of all actions |
| Blacklist CRUD | ✅ Working | Add/remove/view |

### Integrations
| Service | Status |
|---------|--------|
| Resend email | ✅ All transactional emails send |
| Stripe Checkout | ✅ Session creation + webhook handler |
| NorthFlank Cron | ✅ Endpoints exist (`/api/cron/*`), wired to logic |

---

## Known Gaps — Targeting v2.0

### 🔴 Critical (core flow incomplete without these)

| Gap | Where | Impact |
|-----|-------|--------|
| No event edit UI | Admin events | Admin can create events but cannot update title, venue, dates, or capacity after creation |
| No publish / unpublish / cancel buttons | Admin event detail page | These API endpoints exist (`PATCH /api/events/[id]`) but no UI surface |
| Payment status invisible to participant | My Registrations page | PENDING_PAYMENT registrations look the same as PENDING; no payment deadline shown |
| No Stripe payment link shown | My Registrations page | Participants must find the payment link from their email only |
| No camera error handling | Check-in scanner | If camera permission denied, video element just stays blank — no message |

### 🟠 High (friction in every demo scenario)

| Gap | Where | Impact |
|-----|-------|--------|
| No feedback after approve/reject | Registrations table | Action fires but nothing visually confirms it worked |
| Table doesn't auto-refresh after actions | Registrations table | Must manually change filter tab to see updated status |
| No confirmation dialogs on destructive actions | Blacklist add/remove, event cancel | Easy to trigger accidentally; no undo |
| No toast/snackbar system | Entire admin | All server actions are silent after completion |
| Registration table has no search | Registrations table | No way to find a specific participant by name or email |
| Email failures are silent | All email flows | Best-effort with no indicator if Resend failed |

### 🟡 Medium (polish gaps)

| Gap | Where | Impact |
|-----|-------|--------|
| Status filter buttons show no counts | Registrations table | "PENDING" tab gives no indication of how many are pending |
| Audit log not filterable | Audit log page | Hard to find specific event or action in a long log |
| Audit log hardcoded to 200 rows | Audit log page | Will silently truncate beyond 200 entries; no pagination |
| Timestamps not human-friendly | Audit log | Shows raw ISO string; hard to scan |
| No loading states on list pages | Events, registrations | Page appears to "jump" on server re-render |
| No "next steps" after registration | Registration form | Success screen doesn't tell participant what to expect |
| No Enter key in manual check-in | Check-in scanner | Must click button; slows down manual fallback |
| PENDING_PAYMENT not shown distinctly | My Registrations | Participant can't tell apart PENDING from PENDING_PAYMENT |

### 🔵 Low (enhancements, not blockers)

| Gap | Where | Impact |
|-----|-------|--------|
| No CSV export of registrations | Admin event | Organiser can't download attendee list |
| No participant cancellation | My Registrations | Only admin can cancel; participant has no self-service option |
| No bulk approve | Registrations table | Must approve one-by-one even for large batches |
| No "print QR code" button | My Registrations | QR only shows on screen; no print-friendly view |
| Audit log not exportable | Audit log | Can't share compliance log externally |
| No event search/filter | Public events listing | All events shown as flat list; no date/type filter |

---

## API vs UI Gap Summary

These API endpoints exist and work correctly but have **no UI that triggers them**:

| Endpoint | Action | Missing UI |
|----------|--------|------------|
| `PATCH /api/events/[id]` action=publish | Publish draft event | Button on event detail page |
| `PATCH /api/events/[id]` action=unpublish | Unpublish event | Button on event detail page |
| `PATCH /api/events/[id]` action=cancel | Cancel event + notify attendees | Button on event detail page |
| `PATCH /api/events/[id]` (general) | Edit event fields | Edit form on event detail page |
| `DELETE /api/blacklist/[id]` | Remove blacklist entry | ✅ Already has UI — blacklist table |

---

## v2.0 Upgrade Targets

Addressed in the v2.0 design spec at `docs/superpowers/specs/2026-04-08-govent-v2-design.md`.

Priority order:
1. Event management completeness (edit + publish/cancel/unpublish)
2. Toast/confirmation layer across admin
3. Payment visibility in My Registrations
4. Registration table: auto-refresh + search + status counts
5. Check-in camera error fallback + name/email lookup
6. Audit log: filter + human timestamps + pagination
7. Confirmation dialogs on all destructive actions
