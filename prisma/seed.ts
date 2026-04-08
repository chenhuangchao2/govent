import { PrismaClient, RegistrationStatus, PaymentStatus } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// Helper: days from now
function daysFromNow(days: number, hours = 9): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hours, 0, 0, 0)
  return d
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
      email: 'admin@tech.gov.sg',
      name: 'Phoenix Chen',
      passwordHash: hashPassword('admin123'),
    },
  })

  // ─── Event 1: Free, open to all, large capacity ───
  const event1 = await prisma.event.create({
    data: {
      title: 'Q2 All-Hands Townhall',
      description: 'Quarterly update from leadership on agency priorities, headcount plans, and Q3 roadmap. Lunch provided.',
      startTime: daysFromNow(2, 10),
      endTime: daysFromNow(2, 12),
      venue: 'Level 10 Auditorium, Sandcrawler Building',
      capacity: 120,
      registrationDeadline: daysFromNow(1, 18),
      isPublished: true,
      allowedDomains: [],
      allowedOrganisations: [],
      isPaid: false,
      cpdHours: 0,
    },
  })

  // ─── Event 2: Paid, GovTech only ───
  const event2 = await prisma.event.create({
    data: {
      title: 'Advanced Cloud Architecture Workshop',
      description: 'Hands-on workshop covering AWS Well-Architected Framework, multi-region deployment, and cost optimisation strategies. Includes certification voucher.',
      startTime: daysFromNow(5, 9),
      endTime: daysFromNow(5, 17),
      venue: 'Training Room 3B, 10 Pasir Panjang Road',
      capacity: 25,
      registrationDeadline: daysFromNow(4, 18),
      isPublished: true,
      allowedDomains: ['tech.gov.sg'],
      allowedOrganisations: ['GovTech'],
      isPaid: true,
      price: 150,
      paymentDeadlineHours: 48,
      cpdHours: 8,
    },
  })

  // ─── Event 3: Free, open, small capacity → demo waitlist ───
  const event3 = await prisma.event.create({
    data: {
      title: 'Design Thinking for Public Services',
      description: 'Learn human-centred design methods applied to government digital services. Facilitated by GDS UX team.',
      startTime: daysFromNow(3, 14),
      endTime: daysFromNow(3, 18),
      venue: 'PIXEL, 10 Central Exchange Green',
      capacity: 3,
      registrationDeadline: daysFromNow(2, 18),
      isPublished: true,
      allowedDomains: [],
      allowedOrganisations: [],
      isPaid: false,
      cpdHours: 4,
    },
  })

  // ─── Event 4: Cybersecurity, CSA + GovTech, free ───
  const event4 = await prisma.event.create({
    data: {
      title: 'Government Cybersecurity Awareness Day',
      description: 'Interactive session on phishing prevention, zero-trust architecture, and incident response best practices. Mandatory for all IT staff.',
      startTime: daysFromNow(6, 9),
      endTime: daysFromNow(6, 13),
      venue: 'CSA Office, 5 Maxwell Road, Level 3',
      capacity: 80,
      registrationDeadline: daysFromNow(5, 18),
      isPublished: true,
      allowedDomains: [],
      allowedOrganisations: ['CSA', 'GovTech'],
      isPaid: false,
      cpdHours: 4,
    },
  })

  // ─── Event 5: AI workshop, open to all, paid ───
  const event5 = await prisma.event.create({
    data: {
      title: 'Practical AI for Government Officers',
      description: 'Hands-on workshop: prompt engineering, RAG pipelines, and responsible AI deployment in public sector. Bring your own laptop.',
      startTime: daysFromNow(8, 9),
      endTime: daysFromNow(8, 17),
      venue: 'GovTech Hive, Mapletree Business City',
      capacity: 40,
      registrationDeadline: daysFromNow(7, 18),
      isPublished: true,
      allowedDomains: [],
      allowedOrganisations: [],
      isPaid: true,
      price: 50,
      paymentDeadlineHours: 48,
      cpdHours: 8,
    },
  })

  // ─── Event 6: IMDA only, free ───
  const event6 = await prisma.event.create({
    data: {
      title: 'Digital Inclusion Roundtable',
      description: 'Discuss strategies for bridging the digital divide in Singapore — seniors, low-income families, and persons with disabilities.',
      startTime: daysFromNow(10, 14),
      endTime: daysFromNow(10, 17),
      venue: 'IMDA Office, 10 Pasir Panjang Road',
      capacity: 30,
      registrationDeadline: daysFromNow(9, 18),
      isPublished: true,
      allowedDomains: [],
      allowedOrganisations: ['IMDA'],
      isPaid: false,
      cpdHours: 3,
    },
  })

  // ─── Event 7: Next week, free, open ───
  const event7 = await prisma.event.create({
    data: {
      title: 'Agile & Scrum in Government Projects',
      description: 'Introduction to agile methodology tailored for government procurement timelines and compliance requirements.',
      startTime: daysFromNow(4, 10),
      endTime: daysFromNow(4, 12),
      venue: 'Meeting Room 8A, PSA Building',
      capacity: 50,
      registrationDeadline: daysFromNow(3, 18),
      isPublished: true,
      allowedDomains: [],
      allowedOrganisations: [],
      isPaid: false,
      cpdHours: 2,
    },
  })

  // ─── Registrations for Event 1 (5 pending) ───
  const event1Participants = [
    { name: 'Tan Wei Ming', email: 'weiming@tech.gov.sg', organisation: 'GovTech' },
    { name: 'Priya Nair', email: 'priya@tech.gov.sg', organisation: 'GovTech' },
    { name: 'Muhammad Faizal', email: 'faizal@tech.gov.sg', organisation: 'GovTech' },
    { name: 'Chen Li Ting', email: 'liting@imda.gov.sg', organisation: 'IMDA' },
    { name: 'Rajan Suresh', email: 'rajan@csa.gov.sg', organisation: 'CSA' },
  ]
  for (const p of event1Participants) {
    await prisma.registration.create({
      data: { eventId: event1.id, ...p, status: RegistrationStatus.PENDING, paymentStatus: PaymentStatus.NOT_REQUIRED },
    })
  }

  // ─── Registrations for Event 3 (3 approved + 1 waitlisted → demo waitlist) ───
  const event3Participants = [
    { name: 'Lim Jia Hui', email: 'jiahui@tech.gov.sg', organisation: 'GovTech', status: RegistrationStatus.APPROVED },
    { name: 'Kevin Ong', email: 'kevin@imda.gov.sg', organisation: 'IMDA', status: RegistrationStatus.APPROVED },
    { name: 'Siti Rahimah', email: 'siti@csa.gov.sg', organisation: 'CSA', status: RegistrationStatus.APPROVED },
    { name: 'David Chua', email: 'david@tech.gov.sg', organisation: 'GovTech', status: RegistrationStatus.WAITLISTED },
  ]
  for (let i = 0; i < event3Participants.length; i++) {
    const p = event3Participants[i]
    await prisma.registration.create({
      data: {
        eventId: event3.id, name: p.name, email: p.email, organisation: p.organisation,
        status: p.status, waitlistPosition: p.status === RegistrationStatus.WAITLISTED ? 1 : null,
        paymentStatus: PaymentStatus.NOT_REQUIRED,
      },
    })
  }

  // ─── Registrations for Event 4 (mix of statuses) ───
  const event4Participants = [
    { name: 'Ahmad Rizal', email: 'rizal@csa.gov.sg', organisation: 'CSA', status: RegistrationStatus.APPROVED },
    { name: 'Sarah Lim', email: 'sarah@tech.gov.sg', organisation: 'GovTech', status: RegistrationStatus.PENDING },
    { name: 'James Tan', email: 'james@csa.gov.sg', organisation: 'CSA', status: RegistrationStatus.APPROVED },
  ]
  for (const p of event4Participants) {
    await prisma.registration.create({
      data: { eventId: event4.id, ...p, paymentStatus: PaymentStatus.NOT_REQUIRED },
    })
  }

  // ─── Registrations for Event 5 (paid event, pending) ───
  const event5Participants = [
    { name: 'Rachel Goh', email: 'rachel@tech.gov.sg', organisation: 'GovTech' },
    { name: 'Vikram Singh', email: 'vikram@imda.gov.sg', organisation: 'IMDA' },
  ]
  for (const p of event5Participants) {
    await prisma.registration.create({
      data: { eventId: event5.id, ...p, status: RegistrationStatus.PENDING, paymentStatus: PaymentStatus.NOT_REQUIRED },
    })
  }

  // ─── Blacklist entry ───
  await prisma.blacklist.create({
    data: {
      email: 'noshow@tech.gov.sg',
      reason: 'Registered for 5 events without attending. Auto-flagged by system.',
      source: 'AUTO_NO_SHOW',
      noShowCount: 5,
    },
  })

  // ─── Audit logs ───
  const allEvents = [event1, event2, event3, event4, event5, event6, event7]
  for (const ev of allEvents) {
    await prisma.auditLog.create({
      data: { action: 'CREATE_EVENT', actorId: admin.id, eventId: ev.id, metadata: { title: ev.title } },
    })
  }

  console.log('✅ Seed complete')
  console.log(`   Admin: admin@tech.gov.sg / admin123`)
  console.log(`   Events: ${allEvents.map(e => e.title).join(', ')}`)
  console.log(`   Registrations: ${event1Participants.length + event3Participants.length + event4Participants.length + event5Participants.length} total`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
