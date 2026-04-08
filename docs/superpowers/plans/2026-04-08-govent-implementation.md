# GovEvent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack internal government event registration system with approval workflow, Stripe payments, QR check-in, blacklist, and audit log — deployed on NorthFlank.

**Architecture:** Next.js 15 monorepo with API routes as the backend. Prisma schema is the single source of truth. All external calls (Resend email, Stripe payments) go through `services/`. Admin routes are session-protected. Cron endpoints are secret-protected.

**Tech Stack:** Next.js 15 · TypeScript · Prisma 5 · PostgreSQL · Tailwind · shadcn/ui · Resend · Stripe · qrcode · zod · NorthFlank Cron

---

## File Map

```
prisma/
  schema.prisma          — full data model (Task 1)
  seed.ts                — realistic Singapore demo data (Task 2)

lib/
  db.ts                  — exists, Prisma singleton
  auth.ts                — session read/write helpers (Task 3)
  utils.ts               — exists

services/
  email.ts               — Resend wrapper, all email templates (Task 4)
  stripe.ts              — Stripe session creation + webhook (Task 5)
  qr.ts                  — QR code generation (Task 6)
  waitlist.ts            — waitlist promotion logic (Task 7)
  blacklist.ts           — blacklist check + auto-trigger (Task 7)

app/
  api/
    auth/
      login/route.ts     — POST admin login (Task 3)
      logout/route.ts    — POST logout (Task 3)
    events/
      route.ts           — GET list, POST create (Task 8)
      [id]/route.ts      — GET detail, PATCH update/cancel (Task 8)
    registrations/
      route.ts           — GET list (admin), POST create (Task 9)
      [id]/route.ts      — PATCH approve/reject/cancel (Task 10)
      [id]/checkin/route.ts — POST check-in (Task 11)
    blacklist/
      route.ts           — GET list, POST add (Task 12)
      [id]/route.ts      — DELETE remove (Task 12)
    audit/
      route.ts           — GET log (admin) (Task 12)
    webhook/
      stripe/route.ts    — POST Stripe webhook (Task 13)
    cron/
      reminders/route.ts    — GET T-48h reminders (Task 14)
      payment-timeout/route.ts — GET payment expiry (Task 14)
      no-shows/route.ts     — GET post-event NO_SHOW (Task 14)

  (public)/
    layout.tsx           — public layout (Task 15)
    page.tsx             — redirect to /events (Task 15)
    events/
      page.tsx           — event listing (Task 15)
      [id]/page.tsx      — event detail (Task 16)
    register/
      [id]/page.tsx      — registration form (Task 17)
    my-registrations/
      page.tsx           — participant's registrations + QR codes (Task 18)

  admin/
    layout.tsx           — admin layout + auth guard (Task 19)
    login/page.tsx       — login form (Task 19)
    page.tsx             — dashboard overview (Task 20)
    events/
      page.tsx           — event list (Task 20)
      new/page.tsx       — create event form (Task 20)
      [id]/page.tsx      — event detail + edit (Task 21)
      [id]/registrations/page.tsx — approval list (Task 21)
    checkin/
      [id]/page.tsx      — full-screen QR scanner (Task 22)
    audit-log/page.tsx   — audit timeline (Task 23)
    blacklist/page.tsx   — blacklist management (Task 23)

components/
  ui/                    — shadcn/ui primitives (already initialised)
  layout/
    PublicNav.tsx        — public header (Task 15)
    AdminSidebar.tsx     — admin sidebar (Task 19)
  features/
    EventCard.tsx        — event card with seat counter (Task 15)
    StatusBadge.tsx      — coloured status pill (Task 9)
    RegistrationForm.tsx — form with inline validation (Task 17)
    QrDisplay.tsx        — QR code display (Task 18)
    admin/
      RegistrationRow.tsx   — row with approve/reject actions (Task 21)
      CheckinScanner.tsx    — camera QR scanner (Task 22)
      AuditTimeline.tsx     — timeline list (Task 23)
      BlacklistTable.tsx    — blacklist rows (Task 23)
      EventForm.tsx         — create/edit event form (Task 20)
```

---

## Pre-flight: Install Dependencies

- [ ] **Install required packages**

```bash
cd /Users/huangchao/Documents/DAP_assignment/app
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
npm install resend stripe qrcode zod
npm install --save-dev @types/qrcode
```

Expected: packages added, no errors.

- [ ] **Fix package name**

In `package.json`, change `"name": "dap-tmp"` to `"name": "govent"`.

- [ ] **Verify Docker is running**

```bash
docker ps
```

Expected: Docker daemon responds (even if no containers running yet).

- [ ] **Start PostgreSQL**

```bash
docker-compose up -d db
```

Expected: `govent-db-1` container running.

---

## Task 1: Prisma Schema

**Files:** `prisma/schema.prisma`

- [ ] **Write full schema**

Replace the contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  createdAt    DateTime @default(now())

  auditLogs    AuditLog[]
}

model Event {
  id                  String        @id @default(cuid())
  title               String
  description         String
  startTime           DateTime
  endTime             DateTime
  venue               String
  capacity            Int
  registrationDeadline DateTime
  isPublished         Boolean       @default(false)
  isCancelled         Boolean       @default(false)
  noShowProcessed     Boolean       @default(false)

  // Eligibility
  allowedDomains      String[]      // e.g. ["govtech.gov.sg", "mci.gov.sg"]
  allowedDepartments  String[]      // e.g. ["Engineering", "Policy"] — empty = all

  // Payment
  isPaid              Boolean       @default(false)
  price               Float?        // SGD, null if free
  paymentDeadlineHours Int          @default(48)

  // CPD
  cpdHours            Float         @default(0)

  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  registrations       Registration[]
  auditLogs           AuditLog[]
}

model Registration {
  id              String             @id @default(cuid())
  eventId         String
  event           Event              @relation(fields: [eventId], references: [id])

  // Participant info
  name            String
  email           String
  department      String
  remarks         String?

  // Status
  status          RegistrationStatus @default(PENDING)
  waitlistPosition Int?

  // Payment
  paymentStatus   PaymentStatus      @default(NOT_REQUIRED)
  stripeSessionId String?
  paymentDeadline DateTime?
  paidAt          DateTime?

  // Check-in
  checkedInAt     DateTime?

  // Reminders
  reminderSent    Boolean            @default(false)

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  auditLogs       AuditLog[]

  @@unique([eventId, email])
}

model Blacklist {
  id          String          @id @default(cuid())
  email       String          @unique
  reason      String
  source      BlacklistSource @default(MANUAL)
  noShowCount Int             @default(0)
  isActive    Boolean         @default(true)
  addedAt     DateTime        @default(now())
  removedAt   DateTime?
}

model AuditLog {
  id             String   @id @default(cuid())
  action         String   // e.g. "APPROVE", "REJECT", "CHECKIN", "CREATE_EVENT"
  actorId        String?
  actor          User?    @relation(fields: [actorId], references: [id])
  eventId        String?
  event          Event?   @relation(fields: [eventId], references: [id])
  registrationId String?
  registration   Registration? @relation(fields: [registrationId], references: [id])
  metadata       Json?    // extra context
  ipAddress      String?
  createdAt      DateTime @default(now())
}

enum RegistrationStatus {
  PENDING
  APPROVED
  REJECTED
  WAITLISTED
  PENDING_PAYMENT
  PAYMENT_FAILED
  ATTENDED
  NO_SHOW
  CANCELLED
}

enum PaymentStatus {
  NOT_REQUIRED
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum BlacklistSource {
  MANUAL
  AUTO_NO_SHOW
  AUTO_PAYMENT
}
```

- [ ] **Push schema to database**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
cd /Users/huangchao/Documents/DAP_assignment/app
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Generate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add full Prisma schema for GovEvent"
```

---

## Task 2: Seed Data

**Files:** `prisma/seed.ts`

- [ ] **Add seed script to package.json**

Add to `package.json`:
```json
"prisma": {
  "seed": "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
},
"scripts": {
  ...existing scripts...,
  "db:seed": "npx prisma db seed",
  "db:reset": "npx prisma db push --force-reset && npx prisma db seed"
}
```

- [ ] **Install ts-node**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
npm install --save-dev ts-node
```

- [ ] **Write seed file**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient, RegistrationStatus, PaymentStatus } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function main() {
  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.registration.deleteMany()
  await prisma.blacklist.deleteMany()
  await prisma.event.deleteMany()
  await prisma.user.deleteMany()

  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@govtech.gov.sg',
      name: 'Sarah Lim',
      passwordHash: hashPassword('admin123'),
    },
  })

  const now = new Date()

  // Event 1: Upcoming, free, open
  const event1 = await prisma.event.create({
    data: {
      title: 'Q2 All-Hands Townhall',
      description: 'Quarterly update from leadership on agency priorities, headcount plans, and Q3 roadmap. Lunch provided.',
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      venue: 'Level 10 Auditorium, Sandcrawler Building',
      capacity: 120,
      registrationDeadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowedDomains: ['govtech.gov.sg', 'tech.gov.sg'],
      allowedDepartments: [],
      isPaid: false,
      cpdHours: 0,
    },
  })

  // Event 2: Upcoming, paid, limited seats
  const event2 = await prisma.event.create({
    data: {
      title: 'Advanced Cloud Architecture Workshop',
      description: 'Hands-on workshop covering AWS Well-Architected Framework, multi-region deployment, and cost optimisation strategies. Includes certification voucher.',
      startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      venue: 'Training Room 3B, 10 Pasir Panjang Road',
      capacity: 25,
      registrationDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowedDomains: ['govtech.gov.sg'],
      allowedDepartments: ['Engineering', 'Platform'],
      isPaid: true,
      price: 150,
      paymentDeadlineHours: 48,
      cpdHours: 8,
    },
  })

  // Event 3: Open registration with waitlist scenario
  const event3 = await prisma.event.create({
    data: {
      title: 'Design Thinking for Public Services',
      description: 'Learn human-centred design methods applied to government digital services. Facilitated by GovTech UX team.',
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      venue: 'PIXEL, 10 Central Exchange Green',
      capacity: 3, // low capacity to demo waitlist
      registrationDeadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      isPublished: true,
      allowedDomains: [],
      allowedDepartments: [],
      isPaid: false,
      cpdHours: 4,
    },
  })

  // Registrations for event 1
  const participants = [
    { name: 'Tan Wei Ming', email: 'weiming.tan@govtech.gov.sg', department: 'Engineering' },
    { name: 'Priya Nair', email: 'priya.nair@govtech.gov.sg', department: 'Policy' },
    { name: 'Muhammad Faizal', email: 'faizal@govtech.gov.sg', department: 'Design' },
    { name: 'Chen Li Ting', email: 'liting.chen@govtech.gov.sg', department: 'Engineering' },
    { name: 'Rajan Suresh', email: 'rajan.suresh@tech.gov.sg', department: 'Platform' },
  ]

  for (const p of participants) {
    await prisma.registration.create({
      data: {
        eventId: event1.id,
        name: p.name,
        email: p.email,
        department: p.department,
        status: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.NOT_REQUIRED,
      },
    })
  }

  // Event 3: fill capacity + 1 waitlisted
  const designParticipants = [
    { name: 'Lim Jia Hui', email: 'jiahui@govtech.gov.sg', department: 'Design', status: RegistrationStatus.APPROVED },
    { name: 'Kevin Ong', email: 'kevin.ong@govtech.gov.sg', department: 'Engineering', status: RegistrationStatus.APPROVED },
    { name: 'Siti Rahimah', email: 'siti.rahimah@govtech.gov.sg', department: 'Operations', status: RegistrationStatus.APPROVED },
    { name: 'David Chua', email: 'david.chua@govtech.gov.sg', department: 'Policy', status: RegistrationStatus.WAITLISTED },
  ]

  for (let i = 0; i < designParticipants.length; i++) {
    const p = designParticipants[i]
    await prisma.registration.create({
      data: {
        eventId: event3.id,
        name: p.name,
        email: p.email,
        department: p.department,
        status: p.status,
        waitlistPosition: p.status === RegistrationStatus.WAITLISTED ? 1 : null,
        paymentStatus: PaymentStatus.NOT_REQUIRED,
      },
    })
  }

  // Blacklist entry
  await prisma.blacklist.create({
    data: {
      email: 'noshow@govtech.gov.sg',
      reason: 'Registered for 2 events without attending. Auto-flagged by system.',
      source: 'AUTO_NO_SHOW',
      noShowCount: 2,
    },
  })

  // Audit log entries
  await prisma.auditLog.create({
    data: {
      action: 'CREATE_EVENT',
      actorId: admin.id,
      eventId: event1.id,
      metadata: { title: event1.title },
    },
  })

  console.log('✅ Seed complete')
  console.log(`   Admin: admin@govtech.gov.sg / admin123`)
  console.log(`   Events: ${event1.title}, ${event2.title}, ${event3.title}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Run seed**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
npx prisma db seed
```

Expected:
```
✅ Seed complete
   Admin: admin@govtech.gov.sg / admin123
   Events: Q2 All-Hands Townhall, Advanced Cloud Architecture Workshop, Design Thinking for Public Services
```

- [ ] **Verify in Prisma Studio**

```bash
npx prisma studio
```

Open `http://localhost:5555`. Confirm: 3 Events, 9 Registrations, 1 Blacklist entry.

- [ ] **Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed data with realistic Singapore participants"
```

---

## Task 3: Auth (Session-Based)

**Files:** `lib/auth.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`

- [ ] **Add cookie library**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
npm install iron-session
```

- [ ] **Add session env vars to `.env`**

```
SESSION_SECRET="dev-session-secret-min-32-chars-long!!"
CRON_SECRET="dev-cron-secret"
```

- [ ] **Write `lib/auth.ts`**

```typescript
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId?: string
  userEmail?: string
  userName?: string
  isLoggedIn: boolean
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'govent-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return null
  }
  return session
}
```

- [ ] **Write `app/api/auth/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const user = await db.user.findUnique({ where: { email } })
  const hash = createHash('sha256').update(password).digest('hex')

  if (!user || user.passwordHash !== hash) {
    return NextResponse.json({ data: null, error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await getSession()
  session.isLoggedIn = true
  session.userId = user.id
  session.userEmail = user.email
  session.userName = user.name
  await session.save()

  return NextResponse.json({ data: { name: user.name, email: user.email }, error: null })
}
```

- [ ] **Write `app/api/auth/logout/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  session.destroy()
  return NextResponse.json({ data: { ok: true }, error: null })
}
```

- [ ] **Verify login works**

```bash
curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@govtech.gov.sg","password":"admin123"}' | jq .
```

Expected: `{ "data": { "name": "Sarah Lim", ... }, "error": null }`

- [ ] **Commit**

```bash
git add lib/auth.ts app/api/auth/ .env
git commit -m "feat: add session-based admin auth"
```

---

## Task 4: Email Service

**Files:** `services/email.ts`

- [ ] **Add Resend API key to `.env`**

```
RESEND_API_KEY="re_your_key_here"
RESEND_FROM="noreply@yourdomain.com"
```

> For now use `onboarding@resend.dev` as FROM (Resend's test address that works without domain verification).

- [ ] **Write `services/email.ts`**

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'GovEvent <onboarding@resend.dev>'

export async function sendRegistrationConfirmation(opts: {
  to: string; name: string; eventTitle: string; eventDate: string; status: string
}) {
  const statusText = opts.status === 'WAITLISTED'
    ? 'You are on the <strong>waitlist</strong>. We will notify you if a spot opens.'
    : 'Your registration is <strong>pending approval</strong>. You will be notified once reviewed.'

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Registration received: ${opts.eventTitle}`,
    html: `<p>Hi ${opts.name},</p><p>We received your registration for <strong>${opts.eventTitle}</strong> on ${opts.eventDate}.</p><p>${statusText}</p><p>GovEvent Team</p>`,
  })
}

export async function sendApprovalEmail(opts: {
  to: string; name: string; eventTitle: string; eventDate: string; qrCodeDataUrl: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Approved: ${opts.eventTitle}`,
    html: `<p>Hi ${opts.name},</p><p>Your registration for <strong>${opts.eventTitle}</strong> on ${opts.eventDate} has been <strong>approved</strong>.</p><p>Show this QR code at the entrance:</p><img src="${opts.qrCodeDataUrl}" width="200" height="200" /><p>GovEvent Team</p>`,
  })
}

export async function sendRejectionEmail(opts: {
  to: string; name: string; eventTitle: string; reason: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Registration update: ${opts.eventTitle}`,
    html: `<p>Hi ${opts.name},</p><p>Your registration for <strong>${opts.eventTitle}</strong> was not approved.</p><p><strong>Reason:</strong> ${opts.reason}</p><p>GovEvent Team</p>`,
  })
}

export async function sendPaymentLinkEmail(opts: {
  to: string; name: string; eventTitle: string; paymentUrl: string; deadline: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Payment required: ${opts.eventTitle}`,
    html: `<p>Hi ${opts.name},</p><p>Your registration for <strong>${opts.eventTitle}</strong> has been approved. Please complete payment by <strong>${opts.deadline}</strong>.</p><p><a href="${opts.paymentUrl}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Pay Now</a></p><p>GovEvent Team</p>`,
  })
}

export async function sendWaitlistPromotionEmail(opts: {
  to: string; name: string; eventTitle: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `A spot opened: ${opts.eventTitle}`,
    html: `<p>Hi ${opts.name},</p><p>A spot has opened for <strong>${opts.eventTitle}</strong>. Your registration is now pending approval. You have <strong>24 hours</strong> to confirm by keeping your registration active.</p><p>GovEvent Team</p>`,
  })
}

export async function sendReminderEmail(opts: {
  to: string; name: string; eventTitle: string; eventDate: string; venue: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Reminder: ${opts.eventTitle} tomorrow`,
    html: `<p>Hi ${opts.name},</p><p>This is a reminder that <strong>${opts.eventTitle}</strong> is happening tomorrow.</p><p><strong>Date:</strong> ${opts.eventDate}<br/><strong>Venue:</strong> ${opts.venue}</p><p>GovEvent Team</p>`,
  })
}

export async function sendBlacklistNotification(opts: {
  to: string; name: string; reason: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'GovEvent: Registration access restricted',
    html: `<p>Hi ${opts.name},</p><p>Your account has been restricted from registering for events. Reason: ${opts.reason}</p><p>Please contact your event coordinator to resolve this.</p><p>GovEvent Team</p>`,
  })
}

export async function sendCancellationEmail(opts: {
  to: string; name: string; eventTitle: string
}) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Cancelled: ${opts.eventTitle}`,
    html: `<p>Hi ${opts.name},</p><p>We regret to inform you that <strong>${opts.eventTitle}</strong> has been cancelled. We apologise for any inconvenience caused.</p><p>GovEvent Team</p>`,
  })
}
```

- [ ] **Commit**

```bash
git add services/email.ts .env
git commit -m "feat: add Resend email service with all templates"
```

---

## Task 5: QR Code + Stripe Services

**Files:** `services/qr.ts`, `services/stripe.ts`

- [ ] **Write `services/qr.ts`**

```typescript
import QRCode from 'qrcode'

export async function generateQRCodeDataUrl(registrationId: string): Promise<string> {
  return QRCode.toDataURL(registrationId, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}
```

- [ ] **Add Stripe keys to `.env`**

```
STRIPE_SECRET_KEY="sk_test_your_key"
STRIPE_WEBHOOK_SECRET="whsec_your_secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Write `services/stripe.ts`**

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function createCheckoutSession(opts: {
  registrationId: string
  eventTitle: string
  price: number      // SGD
  participantEmail: string
  deadlineHours: number
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'sgd',
        product_data: { name: opts.eventTitle },
        unit_amount: Math.round(opts.price * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    customer_email: opts.participantEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-registrations?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-registrations?payment=cancelled`,
    metadata: { registrationId: opts.registrationId },
    expires_at: Math.floor(Date.now() / 1000) + opts.deadlineHours * 3600,
  })
  return session.url as string
}

export { stripe }
```

- [ ] **Commit**

```bash
git add services/qr.ts services/stripe.ts .env
git commit -m "feat: add QR code generation and Stripe service"
```

---

## Task 6: Waitlist + Blacklist Services

**Files:** `services/waitlist.ts`, `services/blacklist.ts`

- [ ] **Write `services/waitlist.ts`**

```typescript
import { db } from '@/lib/db'
import { sendWaitlistPromotionEmail } from './email'

export async function promoteWaitlist(eventId: string): Promise<void> {
  const next = await db.registration.findFirst({
    where: { eventId, status: 'WAITLISTED' },
    orderBy: { createdAt: 'asc' },
    include: { event: true },
  })

  if (!next) return

  await db.registration.update({
    where: { id: next.id },
    data: { status: 'PENDING', waitlistPosition: null },
  })

  // Renumber remaining waitlist
  const remaining = await db.registration.findMany({
    where: { eventId, status: 'WAITLISTED' },
    orderBy: { createdAt: 'asc' },
  })

  for (let i = 0; i < remaining.length; i++) {
    await db.registration.update({
      where: { id: remaining[i].id },
      data: { waitlistPosition: i + 1 },
    })
  }

  await db.auditLog.create({
    data: {
      action: 'WAITLIST_PROMOTED',
      eventId,
      registrationId: next.id,
      metadata: { promotedEmail: next.email },
    },
  })

  await sendWaitlistPromotionEmail({
    to: next.email,
    name: next.name,
    eventTitle: next.event.title,
  })
}
```

- [ ] **Write `services/blacklist.ts`**

```typescript
import { db } from '@/lib/db'
import { sendBlacklistNotification } from './email'

export async function checkBlacklist(email: string): Promise<boolean> {
  const entry = await db.blacklist.findUnique({
    where: { email },
  })
  return !!(entry && entry.isActive)
}

export async function incrementNoShow(email: string, name: string): Promise<void> {
  const THRESHOLD = 2

  const existing = await db.blacklist.findUnique({ where: { email } })

  if (existing) {
    const updated = await db.blacklist.update({
      where: { email },
      data: { noShowCount: { increment: 1 } },
    })
    if (updated.noShowCount >= THRESHOLD && !updated.isActive) {
      await db.blacklist.update({
        where: { email },
        data: { isActive: true, source: 'AUTO_NO_SHOW', removedAt: null },
      })
      await sendBlacklistNotification({
        to: email,
        name,
        reason: `You have missed ${updated.noShowCount} registered events.`,
      })
    }
  } else {
    const created = await db.blacklist.create({
      data: { email, reason: 'Auto-flagged for no-show', source: 'AUTO_NO_SHOW', noShowCount: 1 },
    })
    if (created.noShowCount >= THRESHOLD) {
      await sendBlacklistNotification({
        to: email,
        name,
        reason: `You have missed ${created.noShowCount} registered events.`,
      })
    }
  }
}
```

- [ ] **Commit**

```bash
git add services/waitlist.ts services/blacklist.ts
git commit -m "feat: add waitlist promotion and blacklist auto-trigger services"
```

---

## Task 7: Helper — Audit Log

**Files:** `lib/audit.ts`

- [ ] **Write `lib/audit.ts`**

```typescript
import { db } from './db'
import { NextRequest } from 'next/server'

export async function logAction(opts: {
  action: string
  actorId?: string
  eventId?: string
  registrationId?: string
  metadata?: Record<string, unknown>
  req?: NextRequest
}) {
  await db.auditLog.create({
    data: {
      action: opts.action,
      actorId: opts.actorId,
      eventId: opts.eventId,
      registrationId: opts.registrationId,
      metadata: opts.metadata,
      ipAddress: opts.req?.headers.get('x-forwarded-for') ?? opts.req?.headers.get('x-real-ip') ?? null,
    },
  })
}
```

- [ ] **Commit**

```bash
git add lib/audit.ts
git commit -m "feat: add audit log helper"
```

---

## Task 8: Events API

**Files:** `app/api/events/route.ts`, `app/api/events/[id]/route.ts`

- [ ] **Write `app/api/events/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sendCancellationEmail } from '@/services/email'

// GET /api/events — public list of published events
export async function GET() {
  const events = await db.event.findMany({
    where: { isPublished: true, isCancelled: false },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json({ data: events, error: null })
}

// POST /api/events — admin creates event
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const event = await db.event.create({
    data: {
      title: body.title,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      venue: body.venue,
      capacity: Number(body.capacity),
      registrationDeadline: new Date(body.registrationDeadline),
      allowedDomains: body.allowedDomains ?? [],
      allowedDepartments: body.allowedDepartments ?? [],
      isPaid: body.isPaid ?? false,
      price: body.isPaid ? Number(body.price) : null,
      paymentDeadlineHours: body.paymentDeadlineHours ?? 48,
      cpdHours: Number(body.cpdHours ?? 0),
    },
  })

  await logAction({ action: 'CREATE_EVENT', actorId: session.userId, eventId: event.id, req })
  return NextResponse.json({ data: event, error: null }, { status: 201 })
}
```

- [ ] **Write `app/api/events/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sendCancellationEmail } from '@/services/email'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
  })
  if (!event) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: event, error: null })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'cancel') {
    const event = await db.event.update({ where: { id }, data: { isCancelled: true } })
    const registrations = await db.registration.findMany({
      where: { eventId: id, status: { in: ['PENDING', 'APPROVED', 'WAITLISTED'] } },
    })
    await Promise.allSettled(
      registrations.map(r =>
        sendCancellationEmail({ to: r.email, name: r.name, eventTitle: event.title })
      )
    )
    await logAction({ action: 'CANCEL_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  }

  if (body.action === 'publish') {
    const event = await db.event.update({ where: { id }, data: { isPublished: true } })
    await logAction({ action: 'PUBLISH_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  }

  if (body.action === 'unpublish') {
    const event = await db.event.update({ where: { id }, data: { isPublished: false } })
    await logAction({ action: 'UNPUBLISH_EVENT', actorId: session.userId, eventId: id, req })
    return NextResponse.json({ data: event, error: null })
  }

  // General update
  const event = await db.event.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      venue: body.venue,
      capacity: body.capacity ? Number(body.capacity) : undefined,
      registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : undefined,
    },
  })
  await logAction({ action: 'EDIT_EVENT', actorId: session.userId, eventId: id, req })
  return NextResponse.json({ data: event, error: null })
}
```

- [ ] **Start dev server and verify**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run dev &
sleep 5
curl -s http://localhost:3000/api/events | jq '.data | length'
```

Expected: `3`

- [ ] **Commit**

```bash
git add app/api/events/
git commit -m "feat: add Events API (GET list, POST create, PATCH update/cancel)"
```

---

## Task 9: Registrations API — Submit

**Files:** `app/api/registrations/route.ts`

- [ ] **Write `app/api/registrations/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { checkBlacklist } from '@/services/blacklist'
import { sendRegistrationConfirmation } from '@/services/email'
import { promoteWaitlist } from '@/services/waitlist'

// GET /api/registrations — admin only, filterable by eventId and status
export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')
  const status = searchParams.get('status')

  const registrations = await db.registration.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: { event: { select: { title: true, startTime: true, isPaid: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: registrations, error: null })
}

// POST /api/registrations — participant submits
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { eventId, name, email, department, remarks } = body

  if (!eventId || !name || !email || !department) {
    return NextResponse.json({ data: null, error: 'Missing required fields' }, { status: 400 })
  }

  // Check 1: Blacklist
  const isBlacklisted = await checkBlacklist(email)
  if (isBlacklisted) {
    return NextResponse.json({ data: null, error: 'Please contact the organiser to register.' }, { status: 403 })
  }

  // Fetch event
  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event || !event.isPublished || event.isCancelled) {
    return NextResponse.json({ data: null, error: 'Event not found' }, { status: 404 })
  }

  // Check 2: Eligibility (email domain)
  if (event.allowedDomains.length > 0) {
    const domain = email.split('@')[1]
    if (!event.allowedDomains.includes(domain)) {
      return NextResponse.json({
        data: null,
        error: `This event is restricted to: ${event.allowedDomains.join(', ')}`,
      }, { status: 400 })
    }
  }

  // Check 2b: Eligibility (department)
  if (event.allowedDepartments.length > 0 && !event.allowedDepartments.includes(department)) {
    return NextResponse.json({
      data: null,
      error: `This event is restricted to: ${event.allowedDepartments.join(', ')} departments`,
    }, { status: 400 })
  }

  // Check 3: Registration deadline
  if (new Date() > event.registrationDeadline) {
    return NextResponse.json({ data: null, error: 'Registration has closed for this event' }, { status: 400 })
  }

  // Check 4: Duplicate
  const existing = await db.registration.findUnique({ where: { eventId_email: { eventId, email } } })
  if (existing) {
    return NextResponse.json({ data: null, error: 'You are already registered for this event' }, { status: 400 })
  }

  // Check 4b: Capacity (transactional)
  const registration = await db.$transaction(async (tx) => {
    const count = await tx.registration.count({
      where: { eventId, status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } },
    })

    const status = count >= event.capacity ? 'WAITLISTED' : 'PENDING'
    const waitlistPosition = status === 'WAITLISTED'
      ? await tx.registration.count({ where: { eventId, status: 'WAITLISTED' } }) + 1
      : null

    const reg = await tx.registration.create({
      data: {
        eventId, name, email, department, remarks,
        status,
        waitlistPosition,
        paymentStatus: 'NOT_REQUIRED',
      },
    })

    await tx.auditLog.create({
      data: { action: 'REGISTER', eventId, registrationId: reg.id, metadata: { email, status } },
    })

    return reg
  })

  // Send confirmation email (best-effort)
  await sendRegistrationConfirmation({
    to: email,
    name,
    eventTitle: event.title,
    eventDate: event.startTime.toLocaleDateString('en-SG'),
    status: registration.status,
  }).catch(console.error)

  return NextResponse.json({ data: registration, error: null }, { status: 201 })
}
```

- [ ] **Verify registration works**

```bash
EVENT_ID=$(curl -s http://localhost:3000/api/events | jq -r '.data[0].id')
curl -s -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"name\":\"Test User\",\"email\":\"test@govtech.gov.sg\",\"department\":\"Engineering\"}" | jq .
```

Expected: `{ "data": { "status": "PENDING", ... }, "error": null }`

- [ ] **Commit**

```bash
git add app/api/registrations/route.ts
git commit -m "feat: add registration submission API with eligibility + capacity transaction"
```

---

## Task 10: Registrations API — Approve/Reject

**Files:** `app/api/registrations/[id]/route.ts`

- [ ] **Write `app/api/registrations/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sendApprovalEmail, sendRejectionEmail, sendPaymentLinkEmail } from '@/services/email'
import { generateQRCodeDataUrl } from '@/services/qr'
import { createCheckoutSession } from '@/services/stripe'
import { promoteWaitlist } from '@/services/waitlist'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, reason } = body

  const reg = await db.registration.findUnique({
    where: { id },
    include: { event: true },
  })
  if (!reg) return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    if (reg.status !== 'PENDING') {
      return NextResponse.json({ data: null, error: 'Can only approve PENDING registrations' }, { status: 400 })
    }

    if (reg.event.isPaid && reg.event.price) {
      // Paid: create Stripe session
      const paymentUrl = await createCheckoutSession({
        registrationId: reg.id,
        eventTitle: reg.event.title,
        price: reg.event.price,
        participantEmail: reg.email,
        deadlineHours: reg.event.paymentDeadlineHours,
      })

      const deadline = new Date(Date.now() + reg.event.paymentDeadlineHours * 3600 * 1000)
      const updated = await db.registration.update({
        where: { id },
        data: { status: 'PENDING_PAYMENT', stripeSessionId: paymentUrl, paymentStatus: 'PENDING', paymentDeadline: deadline },
      })

      await sendPaymentLinkEmail({
        to: reg.email, name: reg.name, eventTitle: reg.event.title,
        paymentUrl, deadline: deadline.toLocaleDateString('en-SG'),
      }).catch(console.error)

      await logAction({ action: 'APPROVE', actorId: session.userId, eventId: reg.eventId, registrationId: id, req })
      return NextResponse.json({ data: updated, error: null })
    } else {
      // Free: approve directly
      const qrCode = await generateQRCodeDataUrl(id)
      const updated = await db.registration.update({
        where: { id },
        data: { status: 'APPROVED' },
      })

      await sendApprovalEmail({
        to: reg.email, name: reg.name, eventTitle: reg.event.title,
        eventDate: reg.event.startTime.toLocaleDateString('en-SG'), qrCodeDataUrl: qrCode,
      }).catch(console.error)

      await logAction({ action: 'APPROVE', actorId: session.userId, eventId: reg.eventId, registrationId: id, req })
      return NextResponse.json({ data: updated, error: null })
    }
  }

  if (action === 'reject') {
    if (!reason) return NextResponse.json({ data: null, error: 'Rejection reason required' }, { status: 400 })
    const updated = await db.registration.update({
      where: { id },
      data: { status: 'REJECTED' },
    })
    await promoteWaitlist(reg.eventId)
    await sendRejectionEmail({ to: reg.email, name: reg.name, eventTitle: reg.event.title, reason }).catch(console.error)
    await logAction({ action: 'REJECT', actorId: session.userId, eventId: reg.eventId, registrationId: id, metadata: { reason }, req })
    return NextResponse.json({ data: updated, error: null })
  }

  if (action === 'cancel') {
    const updated = await db.registration.update({ where: { id }, data: { status: 'CANCELLED' } })
    if (['APPROVED', 'PENDING'].includes(reg.status)) await promoteWaitlist(reg.eventId)
    await logAction({ action: 'CANCEL_REGISTRATION', actorId: session.userId, registrationId: id, req })
    return NextResponse.json({ data: updated, error: null })
  }

  if (action === 'mark-paid') {
    const qrCode = await generateQRCodeDataUrl(id)
    const updated = await db.registration.update({
      where: { id },
      data: { status: 'APPROVED', paymentStatus: 'PAID', paidAt: new Date() },
    })
    await sendApprovalEmail({
      to: reg.email, name: reg.name, eventTitle: reg.event.title,
      eventDate: reg.event.startTime.toLocaleDateString('en-SG'), qrCodeDataUrl: qrCode,
    }).catch(console.error)
    await logAction({ action: 'MARK_PAID', actorId: session.userId, registrationId: id, req })
    return NextResponse.json({ data: updated, error: null })
  }

  if (action === 'resend-email') {
    if (reg.status === 'APPROVED') {
      const qrCode = await generateQRCodeDataUrl(id)
      await sendApprovalEmail({
        to: reg.email, name: reg.name, eventTitle: reg.event.title,
        eventDate: reg.event.startTime.toLocaleDateString('en-SG'), qrCodeDataUrl: qrCode,
      })
    }
    await logAction({ action: 'RESEND_EMAIL', actorId: session.userId, registrationId: id, req })
    return NextResponse.json({ data: { ok: true }, error: null })
  }

  return NextResponse.json({ data: null, error: 'Unknown action' }, { status: 400 })
}
```

- [ ] **Commit**

```bash
git add app/api/registrations/[id]/route.ts
git commit -m "feat: add registration approve/reject/cancel API with Stripe + email"
```

---

## Task 11: Check-in, Blacklist, Audit APIs

**Files:** `app/api/registrations/[id]/checkin/route.ts`, `app/api/blacklist/route.ts`, `app/api/blacklist/[id]/route.ts`, `app/api/audit/route.ts`

- [ ] **Write `app/api/registrations/[id]/checkin/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const reg = await db.registration.findUnique({ where: { id }, include: { event: true } })

  if (!reg) return NextResponse.json({ data: null, error: 'Registration not found' }, { status: 404 })

  // Validate event match
  if (body.eventId && reg.eventId !== body.eventId) {
    return NextResponse.json({ data: null, error: 'QR code is for a different event' }, { status: 400 })
  }

  if (reg.status === 'ATTENDED') {
    const time = reg.checkedInAt?.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
    return NextResponse.json({ data: null, error: `Already checked in at ${time}` }, { status: 400 })
  }

  if (reg.status !== 'APPROVED') {
    return NextResponse.json({ data: null, error: 'Registration is not approved' }, { status: 400 })
  }

  const updated = await db.registration.update({
    where: { id },
    data: { status: 'ATTENDED', checkedInAt: new Date() },
  })

  await logAction({ action: 'CHECKIN', actorId: session.userId, eventId: reg.eventId, registrationId: id, req })
  return NextResponse.json({ data: { name: reg.name, checkedInAt: updated.checkedInAt }, error: null })
}
```

- [ ] **Write `app/api/blacklist/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  const entries = await db.blacklist.findMany({ orderBy: { addedAt: 'desc' } })
  return NextResponse.json({ data: entries, error: null })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  const { email, reason } = await req.json()
  if (!email || !reason) return NextResponse.json({ data: null, error: 'email and reason required' }, { status: 400 })

  const entry = await db.blacklist.upsert({
    where: { email },
    update: { isActive: true, reason, source: 'MANUAL', removedAt: null },
    create: { email, reason, source: 'MANUAL' },
  })
  await logAction({ action: 'BLACKLIST_ADD', actorId: session.userId, metadata: { email, reason }, req })
  return NextResponse.json({ data: entry, error: null }, { status: 201 })
}
```

- [ ] **Write `app/api/blacklist/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  const entry = await db.blacklist.update({
    where: { id },
    data: { isActive: false, removedAt: new Date() },
  })
  await logAction({ action: 'BLACKLIST_REMOVE', actorId: session.userId, metadata: { email: entry.email }, req })
  return NextResponse.json({ data: entry, error: null })
}
```

- [ ] **Write `app/api/audit/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')

  const logs = await db.auditLog.findMany({
    where: eventId ? { eventId } : {},
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ data: logs, error: null })
}
```

- [ ] **Commit**

```bash
git add app/api/registrations/[id]/checkin/ app/api/blacklist/ app/api/audit/
git commit -m "feat: add check-in, blacklist, and audit log APIs"
```

---

## Task 12: Stripe Webhook + Cron Jobs

**Files:** `app/api/webhook/stripe/route.ts`, `app/api/cron/reminders/route.ts`, `app/api/cron/payment-timeout/route.ts`, `app/api/cron/no-shows/route.ts`

- [ ] **Write `app/api/webhook/stripe/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/services/stripe'
import { db } from '@/lib/db'
import { generateQRCodeDataUrl } from '@/services/qr'
import { sendApprovalEmail } from '@/services/email'
import { logAction } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET as string)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const registrationId = session.metadata?.registrationId

    if (!registrationId) return NextResponse.json({ received: true })

    const reg = await db.registration.findUnique({ where: { id: registrationId }, include: { event: true } })
    if (!reg) return NextResponse.json({ received: true })

    const qrCode = await generateQRCodeDataUrl(registrationId)
    await db.registration.update({
      where: { id: registrationId },
      data: { status: 'APPROVED', paymentStatus: 'PAID', paidAt: new Date() },
    })

    await sendApprovalEmail({
      to: reg.email, name: reg.name, eventTitle: reg.event.title,
      eventDate: reg.event.startTime.toLocaleDateString('en-SG'), qrCodeDataUrl: qrCode,
    }).catch(console.error)

    await logAction({ action: 'PAYMENT_CONFIRMED', registrationId, eventId: reg.eventId, metadata: { stripeSession: session.id } })
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Write `app/api/cron/reminders/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendReminderEmail } from '@/services/email'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() + 47 * 3600 * 1000)
  const windowEnd = new Date(now.getTime() + 49 * 3600 * 1000)

  const events = await db.event.findMany({
    where: { startTime: { gte: windowStart, lte: windowEnd }, isPublished: true, isCancelled: false },
  })

  let sent = 0
  for (const event of events) {
    const registrations = await db.registration.findMany({
      where: { eventId: event.id, status: 'APPROVED', reminderSent: false },
    })
    for (const reg of registrations) {
      await sendReminderEmail({
        to: reg.email, name: reg.name, eventTitle: event.title,
        eventDate: event.startTime.toLocaleDateString('en-SG'), venue: event.venue,
      }).catch(console.error)
      await db.registration.update({ where: { id: reg.id }, data: { reminderSent: true } })
      sent++
    }
  }

  return NextResponse.json({ data: { sent }, error: null })
}
```

- [ ] **Write `app/api/cron/payment-timeout/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promoteWaitlist } from '@/services/waitlist'
import { incrementNoShow } from '@/services/blacklist'
import { logAction } from '@/lib/audit'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const expired = await db.registration.findMany({
    where: { status: 'PENDING_PAYMENT', paymentDeadline: { lt: new Date() } },
  })

  for (const reg of expired) {
    await db.registration.update({ where: { id: reg.id }, data: { status: 'PAYMENT_FAILED', paymentStatus: 'FAILED' } })
    await promoteWaitlist(reg.eventId)
    await incrementNoShow(reg.email, reg.name)
    await logAction({ action: 'PAYMENT_TIMEOUT', registrationId: reg.id, eventId: reg.eventId })
  }

  return NextResponse.json({ data: { processed: expired.length }, error: null })
}
```

- [ ] **Write `app/api/cron/no-shows/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { incrementNoShow } from '@/services/blacklist'
import { logAction } from '@/lib/audit'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const events = await db.event.findMany({
    where: { endTime: { lt: new Date() }, noShowProcessed: false, isCancelled: false },
  })

  let processed = 0
  for (const event of events) {
    const noShows = await db.registration.findMany({
      where: { eventId: event.id, status: 'APPROVED' },
    })
    for (const reg of noShows) {
      await db.registration.update({ where: { id: reg.id }, data: { status: 'NO_SHOW' } })
      await incrementNoShow(reg.email, reg.name)
      await logAction({ action: 'NO_SHOW_MARKED', registrationId: reg.id, eventId: event.id })
      processed++
    }
    await db.event.update({ where: { id: event.id }, data: { noShowProcessed: true } })
  }

  return NextResponse.json({ data: { processed }, error: null })
}
```

- [ ] **Commit**

```bash
git add app/api/webhook/ app/api/cron/
git commit -m "feat: add Stripe webhook handler and cron job endpoints"
```

---

## Task 13: Public Layout + Event Listing

**Files:** `app/(public)/layout.tsx`, `app/(public)/events/page.tsx`, `components/layout/PublicNav.tsx`, `components/features/EventCard.tsx`, `components/features/StatusBadge.tsx`

- [ ] **Create public route group and layout**

```typescript
// app/(public)/layout.tsx
import PublicNav from '@/components/layout/PublicNav'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Write `components/layout/PublicNav.tsx`**

```tsx
import Link from 'next/link'

export default function PublicNav() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/events" className="font-semibold text-gray-900">GovEvent</Link>
        <Link href="/my-registrations" className="text-sm text-blue-600 hover:underline">My Registrations</Link>
      </div>
    </nav>
  )
}
```

- [ ] **Write `components/features/StatusBadge.tsx`**

```tsx
const colours: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WAITLISTED: 'bg-blue-100 text-blue-800',
  PENDING_PAYMENT: 'bg-purple-100 text-purple-800',
  PAYMENT_FAILED: 'bg-red-100 text-red-800',
  ATTENDED: 'bg-teal-100 text-teal-800',
  NO_SHOW: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colours[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
```

- [ ] **Write `components/features/EventCard.tsx`**

```tsx
import Link from 'next/link'

interface EventCardProps {
  id: string
  title: string
  startTime: string
  venue: string
  capacity: number
  registeredCount: number
  isPaid: boolean
  price?: number | null
  allowedDomains: string[]
  allowedDepartments: string[]
}

export default function EventCard({ id, title, startTime, venue, capacity, registeredCount, isPaid, price, allowedDomains, allowedDepartments }: EventCardProps) {
  const available = capacity - registeredCount
  const isFull = available <= 0
  const eligibilityLabel = allowedDomains.length > 0
    ? `${allowedDomains.join(', ')} only`
    : allowedDepartments.length > 0
    ? `${allowedDepartments.join(', ')} dept only`
    : null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isPaid && price
          ? <span className="text-sm font-medium text-purple-700">SGD {price}</span>
          : <span className="text-sm text-green-700">Free</span>
        }
      </div>
      <p className="text-sm text-gray-500 mb-1">📅 {new Date(startTime).toLocaleDateString('en-SG', { dateStyle: 'full' })}</p>
      <p className="text-sm text-gray-500 mb-3">📍 {venue}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isFull ? 'text-red-600' : 'text-gray-700'}`}>
            {isFull ? 'Full — waitlist available' : `${available} / ${capacity} seats left`}
          </span>
          {eligibilityLabel && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{eligibilityLabel}</span>
          )}
        </div>
        <Link href={`/events/${id}`} className="text-sm text-blue-600 hover:underline font-medium">
          View →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Write `app/(public)/events/page.tsx`**

```tsx
import { db } from '@/lib/db'
import EventCard from '@/components/features/EventCard'

export const revalidate = 30

export default async function EventsPage() {
  const events = await db.event.findMany({
    where: { isPublished: true, isCancelled: false },
    include: {
      _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } }
    },
    orderBy: { startTime: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h1>
      {events.length === 0 && <p className="text-gray-500">No upcoming events.</p>}
      <div className="space-y-4">
        {events.map(e => (
          <EventCard
            key={e.id}
            id={e.id}
            title={e.title}
            startTime={e.startTime.toISOString()}
            venue={e.venue}
            capacity={e.capacity}
            registeredCount={e._count.registrations}
            isPaid={e.isPaid}
            price={e.price}
            allowedDomains={e.allowedDomains}
            allowedDepartments={e.allowedDepartments}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Verify in browser**

Open `http://localhost:3000/events`. Should see 3 event cards with seat counts and eligibility labels.

- [ ] **Commit**

```bash
git add app/\(public\)/ components/
git commit -m "feat: add public event listing with seat counter and eligibility labels"
```

---

## Task 14: Event Detail + Registration Form

**Files:** `app/(public)/events/[id]/page.tsx`, `app/(public)/register/[id]/page.tsx`, `components/features/RegistrationForm.tsx`

- [ ] **Write `app/(public)/events/[id]/page.tsx`**

```tsx
import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id, isPublished: true, isCancelled: false },
    include: { _count: { select: { registrations: { where: { status: { in: ['PENDING', 'APPROVED', 'PENDING_PAYMENT'] } } } } } },
  })
  if (!event) notFound()

  const available = event.capacity - event._count.registrations
  const isOpen = new Date() <= event.registrationDeadline

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
      <div className="space-y-1 text-sm text-gray-600 mb-6">
        <p>📅 {event.startTime.toLocaleDateString('en-SG', { dateStyle: 'full' })} · {event.startTime.toLocaleTimeString('en-SG', { timeStyle: 'short' })} – {event.endTime.toLocaleTimeString('en-SG', { timeStyle: 'short' })}</p>
        <p>📍 {event.venue}</p>
        <p>👥 {available > 0 ? `${available} of ${event.capacity} seats available` : `Full — waitlist open`}</p>
        {event.isPaid && <p>💳 SGD {event.price}</p>}
        {event.cpdHours > 0 && <p>🎓 {event.cpdHours} CPD hours</p>}
        {!isOpen && <p className="text-red-600 font-medium">Registration closed</p>}
      </div>
      <p className="text-gray-700 mb-6 whitespace-pre-wrap">{event.description}</p>
      {isOpen && (
        <Link href={`/register/${id}`} className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
          Register Now
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Write `components/features/RegistrationForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from './StatusBadge'

export default function RegistrationForm({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', department: '', remarks: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Inline eligibility pre-check (email domain)
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, ...form }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }
    setResult(data.data)
  }

  if (result) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-semibold mb-2">Registration received!</h2>
        <div className="mb-2"><StatusBadge status={result.status} /></div>
        <p className="text-gray-500 text-sm">
          {result.status === 'WAITLISTED'
            ? 'You are on the waitlist. We will notify you if a spot opens.'
            : 'Your registration is pending approval. Check your email for confirmation.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
        <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
        <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit Registration'}
      </button>
    </form>
  )
}
```

- [ ] **Write `app/(public)/register/[id]/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import RegistrationForm from '@/components/features/RegistrationForm'

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id, isPublished: true, isCancelled: false } })
  if (!event) notFound()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {event.startTime.toLocaleDateString('en-SG', { dateStyle: 'long' })} · {event.venue}
      </p>
      <RegistrationForm eventId={id} eventTitle={event.title} />
    </div>
  )
}
```

- [ ] **Verify in browser**

Open `http://localhost:3000/events` → click an event → click "Register Now" → submit form with `test@govtech.gov.sg`. Should see success state with status badge.

Try submitting with `test@gmail.com` for the townhall event — should show inline error about domain restriction.

- [ ] **Commit**

```bash
git add app/\(public\)/ components/features/RegistrationForm.tsx
git commit -m "feat: add event detail page and registration form with inline validation"
```

---

## Task 15: My Registrations + QR Display

**Files:** `app/(public)/my-registrations/page.tsx`, `components/features/QrDisplay.tsx`

- [ ] **Write `components/features/QrDisplay.tsx`**

```tsx
'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { useEffect } from 'react'

export default function QrDisplay({ registrationId }: { registrationId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(registrationId, { width: 200, margin: 2 }).then(setDataUrl)
  }, [registrationId])

  if (!dataUrl) return <div className="w-[200px] h-[200px] bg-gray-100 animate-pulse rounded" />
  return <img src={dataUrl} alt="QR Code" width={200} height={200} className="rounded border" />
}
```

- [ ] **Write `app/(public)/my-registrations/page.tsx`**

This page requires user to enter their email to look up registrations:

```tsx
'use client'

import { useState } from 'react'
import StatusBadge from '@/components/features/StatusBadge'
import QrDisplay from '@/components/features/QrDisplay'

export default function MyRegistrationsPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/my-registrations?email=${encodeURIComponent(email)}`)
    const data = await res.json()
    setRegistrations(data.data ?? [])
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Registrations</h1>
      <form onSubmit={lookup} className="flex gap-2 mb-8">
        <input type="email" placeholder="Your work email" value={email}
          onChange={e => setEmail(e.target.value)} required
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'Look up'}
        </button>
      </form>

      {submitted && registrations.length === 0 && (
        <p className="text-gray-500">No registrations found for this email.</p>
      )}

      <div className="space-y-4">
        {registrations.map(r => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{r.event.title}</h3>
                <p className="text-sm text-gray-500">{new Date(r.event.startTime).toLocaleDateString('en-SG', { dateStyle: 'long' })}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            {r.status === 'WAITLISTED' && r.waitlistPosition && (
              <p className="text-sm text-blue-600">Waitlist position: #{r.waitlistPosition}</p>
            )}
            {r.status === 'APPROVED' && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Show this QR code at the entrance</p>
                <QrDisplay registrationId={r.id} />
              </div>
            )}
            {r.event.cpdHours > 0 && r.status === 'ATTENDED' && (
              <p className="text-sm text-green-700 mt-2">🎓 {r.event.cpdHours} CPD hours recorded</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Add `app/api/my-registrations/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email) return NextResponse.json({ data: [], error: null })

  const registrations = await db.registration.findMany({
    where: { email },
    include: { event: { select: { title: true, startTime: true, cpdHours: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ data: registrations, error: null })
}
```

- [ ] **Commit**

```bash
git add app/\(public\)/my-registrations/ components/features/QrDisplay.tsx app/api/my-registrations/
git commit -m "feat: add my registrations page with QR code display"
```

---

## Task 16: Admin Layout + Login

**Files:** `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `components/layout/AdminSidebar.tsx`

- [ ] **Write `app/admin/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-6">GovEvent Admin</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">admin@govtech.gov.sg / admin123</p>
      </div>
    </div>
  )
}
```

- [ ] **Write `components/layout/AdminSidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/audit-log', label: 'Audit Log' },
  { href: '/admin/blacklist', label: 'Blacklist' },
]

export default function AdminSidebar() {
  const path = usePathname()
  return (
    <aside className="w-56 bg-gray-900 min-h-screen px-3 py-6 flex flex-col">
      <p className="text-white font-semibold px-3 mb-6">GovEvent Admin</p>
      <nav className="space-y-1 flex-1">
        {links.map(l => {
          const active = l.exact ? path === l.href : path.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              {l.label}
            </Link>
          )
        })}
      </nav>
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white">Sign out</button>
      </form>
    </aside>
  )
}
```

- [ ] **Write `app/admin/layout.tsx`**

```typescript
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  if (!session) redirect('/admin/login')

  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">{children}</main>
    </div>
  )
}
```

- [ ] **Verify in browser**

Open `http://localhost:3000/admin` → should redirect to `/admin/login`. Login with `admin@govtech.gov.sg` / `admin123` → should land on admin dashboard (blank page for now is fine).

- [ ] **Commit**

```bash
git add app/admin/ components/layout/AdminSidebar.tsx
git commit -m "feat: add admin layout with session auth guard and login page"
```

---

## Task 17: Admin Dashboard + Events

**Files:** `app/admin/page.tsx`, `app/admin/events/page.tsx`, `app/admin/events/new/page.tsx`, `components/features/admin/EventForm.tsx`

- [ ] **Write `app/admin/page.tsx`**

```tsx
import { db } from '@/lib/db'

export default async function AdminDashboard() {
  const [totalEvents, pendingRegs, todayCheckins] = await Promise.all([
    db.event.count({ where: { isPublished: true, isCancelled: false } }),
    db.registration.count({ where: { status: 'PENDING' } }),
    db.registration.count({ where: { status: 'ATTENDED', checkedInAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
  ])

  const stats = [
    { label: 'Active Events', value: totalEvents },
    { label: 'Pending Approval', value: pendingRegs, highlight: pendingRegs > 0 },
    { label: "Today's Check-ins", value: todayCheckins },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.highlight ? 'border-amber-300' : 'border-gray-200'}`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.highlight ? 'text-amber-600' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Write `app/admin/events/page.tsx`**

```tsx
import { db } from '@/lib/db'
import Link from 'next/link'

export default async function AdminEventsPage() {
  const events = await db.event.findMany({
    include: { _count: { select: { registrations: true } } },
    orderBy: { startTime: 'asc' },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link href="/admin/events/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Event
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Title', 'Date', 'Registrations', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.title}</td>
                <td className="px-4 py-3 text-gray-500">{e.startTime.toLocaleDateString('en-SG')}</td>
                <td className="px-4 py-3 text-gray-500">{e._count.registrations}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.isCancelled ? 'bg-red-100 text-red-700' :
                    e.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {e.isCancelled ? 'Cancelled' : e.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${e.id}`} className="text-blue-600 hover:underline mr-3">Manage</Link>
                  <Link href={`/admin/checkin/${e.id}`} className="text-green-600 hover:underline">Check-in</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Write `components/features/admin/EventForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPaid, setIsPaid] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      title: fd.get('title'),
      description: fd.get('description'),
      startTime: fd.get('startTime'),
      endTime: fd.get('endTime'),
      venue: fd.get('venue'),
      capacity: fd.get('capacity'),
      registrationDeadline: fd.get('registrationDeadline'),
      allowedDomains: (fd.get('allowedDomains') as string).split(',').map(s => s.trim()).filter(Boolean),
      allowedDepartments: (fd.get('allowedDepartments') as string).split(',').map(s => s.trim()).filter(Boolean),
      isPaid,
      price: isPaid ? fd.get('price') : null,
      cpdHours: fd.get('cpdHours'),
    }
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    router.push(`/admin/events/${data.data.id}`)
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div><label className={labelClass}>Title</label><input name="title" className={inputClass} required /></div>
      <div><label className={labelClass}>Description</label><textarea name="description" className={inputClass} rows={3} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelClass}>Start Time</label><input type="datetime-local" name="startTime" className={inputClass} required /></div>
        <div><label className={labelClass}>End Time</label><input type="datetime-local" name="endTime" className={inputClass} required /></div>
      </div>
      <div><label className={labelClass}>Venue</label><input name="venue" className={inputClass} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelClass}>Capacity</label><input type="number" name="capacity" className={inputClass} required /></div>
        <div><label className={labelClass}>Registration Deadline</label><input type="datetime-local" name="registrationDeadline" className={inputClass} required /></div>
      </div>
      <div><label className={labelClass}>Allowed Email Domains (comma-separated, empty = all)</label><input name="allowedDomains" placeholder="govtech.gov.sg, tech.gov.sg" className={inputClass} /></div>
      <div><label className={labelClass}>Allowed Departments (comma-separated, empty = all)</label><input name="allowedDepartments" placeholder="Engineering, Policy" className={inputClass} /></div>
      <div><label className={labelClass}>CPD Hours</label><input type="number" name="cpdHours" defaultValue="0" step="0.5" className={inputClass} /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isPaid" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
        <label htmlFor="isPaid" className="text-sm text-gray-700">Paid event</label>
      </div>
      {isPaid && <div><label className={labelClass}>Price (SGD)</label><input type="number" name="price" step="0.01" className={inputClass} /></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  )
}
```

- [ ] **Write `app/admin/events/new/page.tsx`**

```tsx
import EventForm from '@/components/features/admin/EventForm'

export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Event</h1>
      <EventForm />
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/admin/page.tsx app/admin/events/ components/features/admin/EventForm.tsx
git commit -m "feat: add admin dashboard, event list, and create event form"
```

---

## Task 18: Admin Registrations Approval

**Files:** `app/admin/events/[id]/page.tsx`, `app/admin/events/[id]/registrations/page.tsx`, `components/features/admin/RegistrationRow.tsx`

- [ ] **Write `components/features/admin/RegistrationRow.tsx`**

```tsx
'use client'

import { useState } from 'react'
import StatusBadge from '@/components/features/StatusBadge'

interface Props {
  id: string
  name: string
  email: string
  department: string
  status: string
  createdAt: string
  onUpdate: () => void
}

export default function RegistrationRow({ id, name, email, department, status, createdAt, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  async function act(action: string, extra?: Record<string, string>) {
    setLoading(true)
    await fetch(`/api/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    setLoading(false)
    if (action === 'resend-email') { setEmailSent(true); setTimeout(() => setEmailSent(false), 3000) }
    else onUpdate()
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 text-sm">{name}</p>
        <p className="text-xs text-gray-500">{email}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{department}</td>
      <td className="px-4 py-3"><StatusBadge status={status} /></td>
      <td className="px-4 py-3 text-xs text-gray-400">{new Date(createdAt).toLocaleDateString('en-SG')}</td>
      <td className="px-4 py-3">
        {status === 'PENDING' && !showReject && (
          <div className="flex gap-2">
            <button onClick={() => act('approve')} disabled={loading}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50">
              Approve
            </button>
            <button onClick={() => setShowReject(true)}
              className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">
              Reject
            </button>
          </div>
        )}
        {showReject && (
          <div className="flex gap-2 items-center">
            <input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 w-40" />
            <button onClick={() => act('reject', { reason })} disabled={!reason || loading}
              className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50">Confirm</button>
            <button onClick={() => setShowReject(false)} className="text-xs text-gray-500">Cancel</button>
          </div>
        )}
        {status === 'APPROVED' && (
          <button onClick={() => act('resend-email')} disabled={loading}
            className="text-xs text-blue-600 hover:underline">
            {emailSent ? '✓ Sent' : 'Resend email'}
          </button>
        )}
        {status === 'PENDING_PAYMENT' && (
          <button onClick={() => act('mark-paid')} disabled={loading}
            className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50">
            Mark paid
          </button>
        )}
      </td>
    </tr>
  )
}
```

- [ ] **Write `app/admin/events/[id]/registrations/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RegistrationRow from '@/components/features/admin/RegistrationRow'

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW']

export default function RegistrationsPage() {
  const { id } = useParams<{ id: string }>()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')

  async function load() {
    const params = new URLSearchParams({ eventId: id })
    if (filter !== 'ALL') params.set('status', filter)
    const res = await fetch(`/api/registrations?${params}`)
    const data = await res.json()
    setRegistrations(data.data ?? [])
  }

  useEffect(() => { load() }, [filter])

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Participant', 'Department', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registrations.map(r => (
              <RegistrationRow key={r.id} {...r} onUpdate={load} />
            ))}
          </tbody>
        </table>
        {registrations.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No registrations found</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Write `app/admin/events/[id]/page.tsx`**

```tsx
import { db } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  })
  if (!event) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{event.startTime.toLocaleDateString('en-SG', { dateStyle: 'full' })} · {event.venue}</p>
      <div className="flex gap-3 mb-8">
        <Link href={`/admin/events/${id}/registrations`} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Manage Registrations ({event._count.registrations})
        </Link>
        <Link href={`/admin/checkin/${id}`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          Start Check-in
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Verify in browser**

Go to `/admin/events` → click "Manage" on Q2 All-Hands → click "Manage Registrations". Should see 5 PENDING registrations. Approve one — status should change to APPROVED inline.

- [ ] **Commit**

```bash
git add app/admin/events/[id]/ components/features/admin/RegistrationRow.tsx
git commit -m "feat: add admin registration approval dashboard with inline actions"
```

---

## Task 19: QR Check-in Scanner

**Files:** `app/admin/checkin/[id]/page.tsx`, `components/features/admin/CheckinScanner.tsx`

- [ ] **Install QR scanner library**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
npm install @zxing/browser @zxing/library
```

- [ ] **Write `components/features/admin/CheckinScanner.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'

interface Props {
  eventId: string
}

type ScanResult = { success: true; name: string; time: string } | { success: false; error: string }

export default function CheckinScanner({ eventId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [attendedCount, setAttendedCount] = useState(0)
  const [scanning, setScanning] = useState(true)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const lastScanned = useRef<string | null>(null)
  const [manualId, setManualId] = useState('')

  useEffect(() => {
    loadCount()
    const reader = new BrowserQRCodeReader()
    readerRef.current = reader
    if (videoRef.current) {
      reader.decodeFromVideoDevice(undefined, videoRef.current, async (result) => {
        if (!result) return
        const id = result.getText()
        if (id === lastScanned.current) return
        lastScanned.current = id
        await processCheckin(id)
        setTimeout(() => { lastScanned.current = null }, 3000)
      })
    }
    return () => { reader.reset() }
  }, [])

  async function loadCount() {
    const res = await fetch(`/api/registrations?eventId=${eventId}&status=ATTENDED`)
    const data = await res.json()
    setAttendedCount(data.data?.length ?? 0)
  }

  async function processCheckin(registrationId: string) {
    const res = await fetch(`/api/registrations/${registrationId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    const data = await res.json()
    if (res.ok) {
      setResult({ success: true, name: data.data.name, time: new Date(data.data.checkedInAt).toLocaleTimeString('en-SG') })
      setAttendedCount(c => c + 1)
    } else {
      setResult({ success: false, error: data.error })
    }
    setTimeout(() => setResult(null), 3000)
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-4">
        <span className="text-2xl font-bold text-gray-900">{attendedCount} checked in</span>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black" style={{ maxWidth: 400 }}>
        <video ref={videoRef} className="w-full" />
        {result && (
          <div className={`absolute inset-0 flex items-center justify-center ${result.success ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
            <div className="text-white text-center p-6">
              <div className="text-5xl mb-3">{result.success ? '✓' : '✗'}</div>
              <p className="text-xl font-bold">{result.success ? result.name : result.error}</p>
              {result.success && <p className="text-sm opacity-80">Checked in at {result.time}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-500 mb-2">Manual check-in (search by registration ID):</p>
        <div className="flex gap-2">
          <input value={manualId} onChange={e => setManualId(e.target.value)}
            placeholder="Registration ID" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1" />
          <button onClick={() => { if (manualId) processCheckin(manualId) }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Check in</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Write `app/admin/checkin/[id]/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import CheckinScanner from '@/components/features/admin/CheckinScanner'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id } })
  if (!event) notFound()

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">Check-in mode · {event.startTime.toLocaleDateString('en-SG')}</p>
      <CheckinScanner eventId={id} />
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/admin/checkin/ components/features/admin/CheckinScanner.tsx
git commit -m "feat: add QR code check-in scanner with success/error states"
```

---

## Task 20: Audit Log + Blacklist Admin Pages

**Files:** `app/admin/audit-log/page.tsx`, `app/admin/blacklist/page.tsx`, `components/features/admin/AuditTimeline.tsx`, `components/features/admin/BlacklistTable.tsx`

- [ ] **Write `components/features/admin/AuditTimeline.tsx`**

```tsx
interface Entry {
  id: string
  action: string
  actor?: { name: string } | null
  createdAt: string
  metadata?: any
}

export default function AuditTimeline({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-0">
      {entries.map((e, i) => (
        <div key={e.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            {i < entries.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-gray-900">{e.action}</p>
            <p className="text-xs text-gray-400">
              {e.actor?.name ?? 'System'} · {new Date(e.createdAt).toLocaleString('en-SG')}
            </p>
            {e.metadata && (
              <pre className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1 overflow-auto max-w-sm">
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Write `app/admin/audit-log/page.tsx`**

```tsx
import { db } from '@/lib/db'
import AuditTimeline from '@/components/features/admin/AuditTimeline'

export default async function AuditLogPage() {
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <AuditTimeline entries={logs.map(l => ({
          id: l.id,
          action: l.action,
          actor: l.actor,
          createdAt: l.createdAt.toISOString(),
          metadata: l.metadata,
        }))} />
      </div>
    </div>
  )
}
```

- [ ] **Write `components/features/admin/BlacklistTable.tsx`**

```tsx
'use client'

import { useState } from 'react'

interface Entry { id: string; email: string; reason: string; source: string; noShowCount: number; addedAt: string; isActive: boolean }

export default function BlacklistTable({ initial }: { initial: Entry[] }) {
  const [entries, setEntries] = useState(initial)
  const [newEmail, setNewEmail] = useState('')
  const [newReason, setNewReason] = useState('')

  async function add() {
    if (!newEmail || !newReason) return
    const res = await fetch('/api/blacklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail, reason: newReason }) })
    const data = await res.json()
    if (res.ok) { setEntries(e => [data.data, ...e]); setNewEmail(''); setNewReason('') }
  }

  async function remove(id: string) {
    await fetch(`/api/blacklist/${id}`, { method: 'DELETE' })
    setEntries(e => e.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3">
        <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email address" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Reason" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={add} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Add</button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Email', 'Reason', 'Source', 'No-shows', 'Added', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.filter(e => e.isActive).map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.email}</td>
                <td className="px-4 py-3 text-gray-600">{e.reason}</td>
                <td className="px-4 py-3 text-gray-500">{e.source}</td>
                <td className="px-4 py-3 text-gray-500">{e.noShowCount}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.addedAt).toLocaleDateString('en-SG')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(e.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Write `app/admin/blacklist/page.tsx`**

```tsx
import { db } from '@/lib/db'
import BlacklistTable from '@/components/features/admin/BlacklistTable'

export default async function BlacklistPage() {
  const entries = await db.blacklist.findMany({ orderBy: { addedAt: 'desc' } })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Blacklist</h1>
      <BlacklistTable initial={entries.map(e => ({ ...e, addedAt: e.addedAt.toISOString() }))} />
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add app/admin/audit-log/ app/admin/blacklist/ components/features/admin/
git commit -m "feat: add audit log timeline and blacklist management pages"
```

---

## Task 21: Update `app/page.tsx` and Final Polish

- [ ] **Update root page to redirect**

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'
export default function RootPage() {
  redirect('/events')
}
```

- [ ] **Fix package name**

In `package.json` change `"name": "dap-tmp"` to `"name": "govent"`.

- [ ] **Add `app/(public)/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
export default function PublicRoot() {
  redirect('/events')
}
```

- [ ] **Full build check**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run build 2>&1 | tail -20
```

Expected: Build completes with no TypeScript errors. Note any warnings.

- [ ] **Commit**

```bash
git add app/page.tsx app/\(public\)/page.tsx package.json
git commit -m "feat: redirect root to /events, fix package name"
```

---

## Task 22: Docker Build Verification + NorthFlank Deployment

- [ ] **Verify Dockerfile has correct standalone output**

Confirm `next.config.ts` contains:
```typescript
output: "standalone"
```

- [ ] **Test Docker build locally**

```bash
export PATH="$HOME/node-v22.14.0-darwin-arm64/bin:$PATH"
docker build -t govent:local . 2>&1 | tail -20
```

Expected: Build succeeds, final image created.

- [ ] **Set up NorthFlank project**

1. Create account at northflank.com
2. Create new project: "GovEvent"
3. Create PostgreSQL addon (free tier)
4. Note the `DATABASE_URL` from the addon

- [ ] **Create NorthFlank service**

1. Create new service → "Combined Service" → connect to git repo
2. Set Dockerfile path: `app/Dockerfile`
3. Set build context: `app/`
4. Add environment variables:
   ```
   DATABASE_URL=<from NorthFlank postgres addon>
   SESSION_SECRET=<generate: openssl rand -base64 32>
   CRON_SECRET=<generate: openssl rand -base64 16>
   RESEND_API_KEY=<your key>
   RESEND_FROM=<your address>
   STRIPE_SECRET_KEY=<your key>
   STRIPE_WEBHOOK_SECRET=<your key>
   NEXT_PUBLIC_APP_URL=<your NorthFlank URL>
   ```

- [ ] **Set up NorthFlank Cron job**

1. Create new cron job in NorthFlank
2. Schedule: `0 * * * *` (hourly)
3. Command: `curl -H "x-cron-secret: $CRON_SECRET" https://<your-url>/api/cron/reminders && curl -H "x-cron-secret: $CRON_SECRET" https://<your-url>/api/cron/payment-timeout && curl -H "x-cron-secret: $CRON_SECRET" https://<your-url>/api/cron/no-shows`

- [ ] **Set up Stripe webhook**

1. In Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://<your-url>/api/webhook/stripe`
3. Events: `checkout.session.completed`
4. Copy webhook signing secret → update `STRIPE_WEBHOOK_SECRET` in NorthFlank

- [ ] **Verify deployment**

Open the NorthFlank public URL → should see event listing with seed data.

- [ ] **Final commit**

```bash
git add .
git commit -m "chore: deployment configuration complete"
```

---

## Self-Review Checklist

### Spec coverage
- ✅ Event CRUD (Tasks 8, 17)
- ✅ Registration flow + eligibility + capacity transaction (Task 9)
- ✅ Approve/Reject + Stripe paid flow (Task 10)
- ✅ QR check-in with error states (Tasks 11, 19)
- ✅ Waitlist auto-promotion (Task 6)
- ✅ Blacklist check + auto-trigger (Tasks 6, 11, 20)
- ✅ Audit log (Tasks 7, 20)
- ✅ Resend email service (Task 4)
- ✅ Stripe webhook (Task 12)
- ✅ Cron jobs (Task 12)
- ✅ Admin auth (Task 3)
- ✅ Public pages (Tasks 13–15)
- ✅ Admin pages (Tasks 16–20)
- ✅ Deployment (Task 22)
- ✅ Seed data (Task 2)

### Type consistency
- `RegistrationStatus` enum used consistently across all API routes and components
- `PaymentStatus` enum used in Tasks 5, 9, 10, 12
- `promoteWaitlist(eventId: string)` — defined in Task 6, used in Tasks 10, 12
- `incrementNoShow(email: string, name: string)` — defined in Task 6, used in Tasks 12
- `checkBlacklist(email: string): Promise<boolean>` — defined in Task 6, used in Task 9
- `generateQRCodeDataUrl(registrationId: string): Promise<string>` — defined in Task 5, used in Tasks 10, 12
- `logAction(opts)` — defined in Task 7, used across all API routes

### No placeholders: confirmed — all code blocks are complete
