import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { sendApprovalEmail, sendRejectionEmail, sendPaymentLinkEmail } from '@/services/email'
import { generateQRCodeDataUrl } from '@/services/qr'
import { createCheckoutSession } from '@/services/stripe'
import { promoteWaitlist } from '@/services/waitlist'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    if (reg.event.isCancelled) {
      return NextResponse.json({ data: null, error: 'Cannot approve registrations for a cancelled event' }, { status: 400 })
    }
    if (reg.status !== 'PENDING') {
      return NextResponse.json({ data: null, error: 'Can only approve PENDING registrations' }, { status: 400 })
    }

    if (reg.event.isPaid && reg.event.price) {
      // Paid: create Stripe session
      let paymentUrl: string
      try {
        paymentUrl = await createCheckoutSession({
          registrationId: reg.id,
          eventTitle: reg.event.title,
          price: reg.event.price,
          participantEmail: reg.email,
          deadlineHours: reg.event.paymentDeadlineHours,
        })
      } catch (stripeErr) {
        console.error('[Stripe Error]', stripeErr)
        const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe session creation failed'
        return NextResponse.json({ data: null, error: `Stripe error: ${msg}` }, { status: 500 })
      }

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
    if (reg.event.isCancelled) {
      return NextResponse.json({ data: null, error: 'Cannot reject registrations for a cancelled event' }, { status: 400 })
    }
    if (reg.status !== 'PENDING') {
      return NextResponse.json({ data: null, error: 'Can only reject PENDING registrations' }, { status: 400 })
    }
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
    const cancellable = ['PENDING', 'APPROVED', 'WAITLISTED', 'PENDING_PAYMENT']
    if (!cancellable.includes(reg.status)) {
      return NextResponse.json({ data: null, error: `Cannot cancel registration with status ${reg.status}` }, { status: 400 })
    }
    const updated = await db.registration.update({ where: { id }, data: { status: 'CANCELLED' } })
    if (['APPROVED', 'PENDING'].includes(reg.status)) await promoteWaitlist(reg.eventId)
    await logAction({ action: 'CANCEL_REGISTRATION', actorId: session.userId, registrationId: id, req })
    return NextResponse.json({ data: updated, error: null })
  }

  if (action === 'mark-paid') {
    if (reg.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ data: null, error: 'Can only mark PENDING_PAYMENT registrations as paid' }, { status: 400 })
    }
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

  if (action === 'add-note') {
    const { notes } = body
    const updated = await db.registration.update({
      where: { id },
      data: { adminNotes: notes ?? null },
    })
    await logAction({ action: 'ADD_NOTE', actorId: session.userId, registrationId: id, metadata: { notes }, req })
    return NextResponse.json({ data: updated, error: null })
  }

  return NextResponse.json({ data: null, error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[Registration PATCH Error]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ data: null, error: message }, { status: 500 })
  }
}
