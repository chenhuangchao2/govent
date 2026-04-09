import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// One-time seed endpoint — protected by CRON_SECRET
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if already seeded — pass ?reset=true to wipe and re-seed
  const url = new URL(req.url)
  const reset = url.searchParams.get('reset') === 'true'
  const existingUsers = await db.user.count()
  if (existingUsers > 0 && !reset) {
    return NextResponse.json({ data: 'Already seeded. Use ?reset=true to wipe and re-seed.', error: null })
  }
  if (reset) {
    // Delete in correct order (foreign keys)
    await db.auditLog.deleteMany()
    await db.registration.deleteMany()
    await db.blacklist.deleteMany()
    await db.event.deleteMany()
    await db.participant.deleteMany()
    await db.user.deleteMany()
  }

  const hash = (pw: string) => createHash('sha256').update(pw).digest('hex')

  // Create admin users
  const phoenix = await db.user.create({
    data: { email: 'admin@tech.gov.sg', name: 'Phoenix Chen', passwordHash: hash('admin123'), isSuperAdmin: true },
  })
  const sarah = await db.user.create({
    data: { email: 'sarah@tech.gov.sg', name: 'Sarah Lim', passwordHash: hash('admin123') },
  })
  const rajan = await db.user.create({
    data: { email: 'rajan@tech.gov.sg', name: 'Rajan Kumar', passwordHash: hash('admin123') },
  })

  function daysFromNow(days: number, hour: number) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(hour, 0, 0, 0)
    return d
  }

  // Create events
  const events = await Promise.all([
    db.event.create({ data: {
      title: 'Q2 All-Hands Townhall', description: 'Quarterly update from leadership on agency priorities, headcount plans, and Q3 roadmap. Lunch provided.',
      startTime: daysFromNow(7, 10), endTime: daysFromNow(7, 17), venue: 'Level 10 Auditorium, Sandcrawler Building',
      capacity: 120, registrationDeadline: daysFromNow(6, 18), isPublished: true, isFeatured: true,
      tags: ['Leadership'], imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
      creatorId: phoenix.id,
    }}),
    db.event.create({ data: {
      title: 'Advanced Cloud Architecture Workshop', description: 'Hands-on workshop covering AWS Well-Architected Framework, multi-region deployment, and cost optimisation strategies.',
      startTime: daysFromNow(14, 9), endTime: daysFromNow(14, 16), venue: 'Training Room 3B, 10 Pasir Panjang Road',
      capacity: 25, registrationDeadline: daysFromNow(13, 18), isPublished: true,
      tags: ['Cloud'], allowedDomains: ['tech.gov.sg'], allowedOrganisations: ['GovTech'],
      isPaid: true, price: 150, cpdHours: 8, imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
      creatorId: phoenix.id,
    }}),
    db.event.create({ data: {
      title: 'Design Thinking for Public Services', description: 'Learn human-centred design methods applied to government digital services.',
      startTime: daysFromNow(10, 14), endTime: daysFromNow(10, 21), venue: 'PIXEL, 10 Central Exchange Green',
      capacity: 3, registrationDeadline: daysFromNow(9, 18), isPublished: true, isFeatured: true,
      tags: ['Design'], cpdHours: 4, imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&h=400&fit=crop',
      creatorId: sarah.id,
    }}),
    db.event.create({ data: {
      title: 'Practical AI for All', description: 'Hands-on workshop covering AI tools and frameworks for public sector applications.',
      startTime: daysFromNow(17, 9), endTime: daysFromNow(17, 16), venue: 'GovTech Hive, 7 Tampines Grande',
      capacity: 40, registrationDeadline: daysFromNow(16, 18), isPublished: true,
      tags: ['AI', 'Data'], isPaid: true, price: 50, cpdHours: 6, imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
      creatorId: rajan.id,
    }}),
    db.event.create({ data: {
      title: 'Agile & Scrum in Government Projects', description: 'Applying agile methodologies to improve government project delivery.',
      startTime: daysFromNow(12, 10), endTime: daysFromNow(12, 17), venue: 'IMDA Office, 10 Pasir Panjang Road',
      capacity: 50, registrationDeadline: daysFromNow(11, 18), isPublished: true,
      tags: ['Agile'], cpdHours: 5, imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
      creatorId: sarah.id,
    }}),
    db.event.create({ data: {
      title: 'Digital Inclusion Roundtable', description: 'Discussion on bridging the digital divide across demographic groups.',
      startTime: daysFromNow(20, 14), endTime: daysFromNow(20, 17), venue: 'MND Building, Conference Room 5',
      capacity: 30, registrationDeadline: daysFromNow(19, 18), isPublished: true,
      tags: ['Policy'], allowedOrganisations: ['IMDA'],
      imageUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&h=400&fit=crop',
      creatorId: rajan.id,
    }}),
    db.event.create({ data: {
      title: 'Government Cybersecurity Awareness Day', description: 'Annual cybersecurity awareness event for all government employees.',
      startTime: daysFromNow(15, 9), endTime: daysFromNow(15, 16), venue: 'CSA Office, 1 Fusionopolis Walk',
      capacity: 80, registrationDeadline: daysFromNow(14, 18), isPublished: true,
      tags: ['Security'], cpdHours: 3, imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=400&fit=crop',
      creatorId: phoenix.id,
    }}),
  ])

  // Create sample registrations with realistic distribution
  const names = [
    'Amanda Tan', 'Bryan Lee', 'Chloe Ng', 'Daniel Koh', 'Emily Wong',
    'Farid Hassan', 'Grace Lim', 'Henry Teo', 'Irene Chong', 'Jason Phua',
    'Karen Yeo', 'Lawrence Ong', 'Michelle Goh', 'Nathan Sim', 'Olivia Chua',
    'Patrick Raj', 'Queenie Tay', 'Ryan Khoo', 'Timothy Foo', 'Uma Devi',
  ]
  const orgs = ['GovTech', 'IMDA', 'MAS', 'MOE', 'MOH', 'CPFB', 'HDB', 'NEA']
  const domains = ['tech.gov.sg', 'imda.gov.sg', 'mas.gov.sg', 'moe.gov.sg']

  let regCount = 0
  for (const event of events) {
    const cap = event.capacity
    const count = Math.min(names.length, cap + 3) // some overflow for waitlist on small events
    const shuffled = [...names].sort(() => Math.random() - 0.5).slice(0, count)

    for (let i = 0; i < shuffled.length; i++) {
      const activeCount = i // how many we've added so far that are "active"
      let status: string
      if (activeCount < Math.floor(cap * 0.3)) status = 'PENDING'
      else if (activeCount < Math.floor(cap * 0.7)) status = 'APPROVED'
      else if (activeCount < cap) status = 'PENDING'
      else status = 'WAITLISTED' // over capacity

      // Some rejected/cancelled for realism
      if (i > cap && i % 3 === 0) status = 'REJECTED'
      if (i > cap && i % 5 === 0) status = 'CANCELLED'

      const email = shuffled[i].toLowerCase().replace(/\s/g, '.') + '.' + event.id.slice(-4) + '@' + domains[i % domains.length]
      try {
        await db.registration.create({ data: {
          eventId: event.id, name: shuffled[i], email, organisation: orgs[i % orgs.length],
          status: status as any, waitlistPosition: status === 'WAITLISTED' ? i - cap + 1 : null,
        }})
        regCount++
      } catch { /* skip duplicates */ }
    }
  }

  // Past events with CPD for demo
  const pastEvents = [
    { title: 'Digital Economy Symposium', cpdHours: 4.5, daysAgo: 30 },
    { title: 'Data Governance Workshop', cpdHours: 6, daysAgo: 45 },
    { title: 'Leadership in Public Service', cpdHours: 3, daysAgo: 60 },
    { title: 'Cybersecurity Awareness Training', cpdHours: 2, daysAgo: 90 },
  ]
  for (const pe of pastEvents) {
    const start = new Date(Date.now() - pe.daysAgo * 86400000)
    start.setHours(9, 0, 0, 0)
    const event = await db.event.create({ data: {
      title: pe.title, description: pe.title + ' - completed event.',
      startTime: start, endTime: new Date(start.getTime() + 7 * 3600000),
      venue: 'GovTech Training Centre', capacity: 50,
      registrationDeadline: new Date(start.getTime() - 2 * 86400000),
      isPublished: true, cpdHours: pe.cpdHours, tags: ['Training'], creatorId: phoenix.id,
    }})
    // Phoenix attended all past events
    await db.registration.create({ data: {
      eventId: event.id, name: 'Phoenix Chen', email: 'admin@tech.gov.sg',
      organisation: 'GovTech', status: 'ATTENDED', checkedInAt: start,
    }})
  }

  // Create participant account for demo login
  await db.participant.create({ data: {
    email: 'demo@gov.sg', name: 'Demo User', organisation: 'GovTech',
    passwordHash: hash('demo123'), isVerified: true,
  }})

  // Demo user also attended past events (for CPD demo)
  for (const pe of pastEvents) {
    const pastEvent = await db.event.findFirst({ where: { title: pe.title } })
    if (pastEvent) {
      await db.registration.create({ data: {
        eventId: pastEvent.id, name: 'Demo User', email: 'demo@gov.sg',
        organisation: 'GovTech', status: 'ATTENDED',
        checkedInAt: pastEvent.startTime,
      }}).catch(() => {})
    }
  }

  // Demo user has one upcoming APPROVED registration
  await db.registration.create({ data: {
    eventId: events[0].id, name: 'Demo User', email: 'demo@gov.sg',
    organisation: 'GovTech', status: 'APPROVED',
  }}).catch(() => {})

  // Blacklist entries
  await db.blacklist.create({ data: {
    email: 'alex.rivers@cloudmail.com', reason: 'Repeated no-show at premium tier events',
    source: 'AUTO_NO_SHOW', noShowCount: 4,
  }})
  await db.blacklist.create({ data: {
    email: 'm.zhang@techcorp.io', reason: 'Payment failure - High risk chargeback profile',
    source: 'AUTO_PAYMENT', noShowCount: 1,
  }})
  await db.blacklist.create({ data: {
    email: 'jordan.smith_test@mail.com', reason: 'Administrator flag: Violation of terms of service',
    source: 'MANUAL', noShowCount: 0,
  }})

  // Audit log entries
  const auditEntries = [
    { action: 'CREATE_EVENT', actorId: phoenix.id, eventId: events[0].id, metadata: { title: events[0].title } },
    { action: 'PUBLISH_EVENT', actorId: phoenix.id, eventId: events[0].id, metadata: { title: events[0].title } },
    { action: 'CREATE_EVENT', actorId: sarah.id, eventId: events[2].id, metadata: { title: events[2].title } },
    { action: 'PUBLISH_EVENT', actorId: sarah.id, eventId: events[2].id, metadata: { title: events[2].title } },
    { action: 'APPROVE', actorId: phoenix.id, eventId: events[0].id, metadata: { registrantEmail: 'amanda.tan@tech.gov.sg' } },
    { action: 'APPROVE', actorId: phoenix.id, eventId: events[0].id, metadata: { registrantEmail: 'bryan.lee@imda.gov.sg' } },
    { action: 'REJECT', actorId: sarah.id, eventId: events[2].id, metadata: { registrantEmail: 'test@external.com', reason: 'Not eligible' } },
    { action: 'BULK_APPROVE', actorId: phoenix.id, eventId: events[4].id, metadata: { count: 5 } },
    { action: 'ADD_BLACKLIST', actorId: phoenix.id, metadata: { email: 'alex.rivers@cloudmail.com', reason: 'Repeated no-show' } },
    { action: 'CHECKIN', actorId: rajan.id, eventId: events[3].id, metadata: { registrantEmail: 'grace.lim@tech.gov.sg' } },
    { action: 'BROADCAST', actorId: phoenix.id, eventId: events[0].id, metadata: { subject: 'Event reminder', recipients: 15 } },
    { action: 'EDIT_EVENT', actorId: sarah.id, eventId: events[2].id, metadata: { field: 'venue', oldValue: 'TBC', newValue: 'PIXEL, 10 Central Exchange Green' } },
  ]
  for (let i = 0; i < auditEntries.length; i++) {
    await db.auditLog.create({ data: {
      ...auditEntries[i],
      metadata: auditEntries[i].metadata as any,
      createdAt: new Date(Date.now() - (auditEntries.length - i) * 3600000), // stagger by 1h each
    }})
  }

  return NextResponse.json({
    data: {
      admins: 3,
      events: events.length + pastEvents.length,
      registrations: regCount + pastEvents.length,
      blacklist: 3,
      auditLogs: auditEntries.length,
      participant: 'demo@gov.sg / demo123',
    },
    error: null,
  })
}
