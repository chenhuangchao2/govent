import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { generateQRCodeDataUrl } from '@/services/qr'
import { sendApprovalEmail, sendPaymentLinkEmail } from '@/services/email'
import { createCheckoutSession } from '@/services/stripe'

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { registrationIds } = await req.json()
  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return NextResponse.json({ data: null, error: 'registrationIds required' }, { status: 400 })
  }

  let approved = 0
  let skipped = 0
  let pendingPayment = 0

  const results = await Promise.allSettled(
    registrationIds.map(async (id: string) => {
      const reg = await db.registration.findUnique({ where: { id }, include: { event: true } })
      if (!reg || reg.status !== 'PENDING') { skipped++; return }

      if (reg.event.isPaid && reg.event.price) {
        const paymentUrl = await createCheckoutSession({
          registrationId: reg.id,
          eventTitle: reg.event.title,
          price: reg.event.price,
          participantEmail: reg.email,
          deadlineHours: reg.event.paymentDeadlineHours,
        })
        const deadline = new Date(Date.now() + reg.event.paymentDeadlineHours * 3600 * 1000)
        await db.registration.update({
          where: { id },
          data: { status: 'PENDING_PAYMENT', stripeSessionId: paymentUrl, paymentStatus: 'PENDING', paymentDeadline: deadline },
        })
        await sendPaymentLinkEmail({
          to: reg.email, name: reg.name, eventTitle: reg.event.title,
          paymentUrl, deadline: deadline.toLocaleDateString('en-SG'),
        }).catch(console.error)
        pendingPayment++
      } else {
        const qrCode = await generateQRCodeDataUrl(id)
        await db.registration.update({ where: { id }, data: { status: 'APPROVED' } })
        await sendApprovalEmail({
          to: reg.email, name: reg.name, eventTitle: reg.event.title,
          eventDate: reg.event.startTime.toLocaleDateString('en-SG'), qrCodeDataUrl: qrCode,
        }).catch(console.error)
      }

      await logAction({ action: 'APPROVE', actorId: session.userId, eventId: reg.eventId, registrationId: id, req })
      approved++
    })
  )

  return NextResponse.json({ data: { approved, skipped, pendingPayment }, error: null })
}
