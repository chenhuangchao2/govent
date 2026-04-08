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
      name: 'Phoenix Chen',
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
      reason: 'Registered for 5 events without attending. Auto-flagged by system.',
      source: 'AUTO_NO_SHOW',
      noShowCount: 5,
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
