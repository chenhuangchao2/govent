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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = event.data.object as any
    const registrationId = session.metadata?.registrationId

    if (!registrationId) return NextResponse.json({ received: true })

    const reg = await db.registration.findUnique({ where: { id: registrationId }, include: { event: true } })
    if (!reg) return NextResponse.json({ received: true })

    // Don't approve if event was cancelled while user was paying
    if (reg.event.isCancelled) {
      await db.registration.update({
        where: { id: registrationId },
        data: { status: 'CANCELLED', paymentStatus: 'PAID', paidAt: new Date() },
      })
      await logAction({ action: 'PAYMENT_ON_CANCELLED_EVENT', registrationId, eventId: reg.eventId, metadata: { stripeSession: session.id } })
      return NextResponse.json({ received: true })
    }

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
