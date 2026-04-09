import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'GovEvent <onboarding@resend.dev>'

export async function sendRegistrationConfirmation(opts: {
  to: string; name: string; eventTitle: string; eventDate: string; status: string
}) {
  const statusText = opts.status === 'WAITLISTED'
    ? 'You are on the <strong>waitlist</strong>. We will notify you if a spot opens.'
    : 'Your registration is <strong>pending approval</strong>. You will be notified once reviewed.'

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Registration received: ${opts.eventTitle}`,
      html: `<p>Hi ${opts.name},</p><p>We received your registration for <strong>${opts.eventTitle}</strong> on ${opts.eventDate}.</p><p>${statusText}</p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendApprovalEmail(opts: {
  to: string; name: string; eventTitle: string; eventDate: string; qrCodeDataUrl: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Approved: ${opts.eventTitle}`,
      html: `<p>Hi ${opts.name},</p><p>Your registration for <strong>${opts.eventTitle}</strong> on ${opts.eventDate} has been <strong>approved</strong>.</p><p>Show this QR code at the entrance:</p><img src="${opts.qrCodeDataUrl}" width="200" height="200" /><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendRejectionEmail(opts: {
  to: string; name: string; eventTitle: string; reason: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Registration update: ${opts.eventTitle}`,
      html: `<p>Hi ${opts.name},</p><p>Your registration for <strong>${opts.eventTitle}</strong> was not approved.</p><p><strong>Reason:</strong> ${opts.reason}</p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendPaymentLinkEmail(opts: {
  to: string; name: string; eventTitle: string; paymentUrl: string; deadline: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Payment required: ${opts.eventTitle}`,
      html: `<p>Hi ${opts.name},</p><p>Your registration for <strong>${opts.eventTitle}</strong> has been approved. Please complete payment by <strong>${opts.deadline}</strong>.</p><p><a href="${opts.paymentUrl}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Pay Now</a></p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendWaitlistPromotionEmail(opts: {
  to: string; name: string; eventTitle: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `A spot opened: ${opts.eventTitle}`,
      html: `<p>Hi ${opts.name},</p><p>A spot has opened for <strong>${opts.eventTitle}</strong>. Your registration is now pending approval. You have <strong>24 hours</strong> to confirm by keeping your registration active.</p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendReminderEmail(opts: {
  to: string; name: string; eventTitle: string; eventDate: string; venue: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Reminder: ${opts.eventTitle} tomorrow`,
      html: `<p>Hi ${opts.name},</p><p>This is a reminder that <strong>${opts.eventTitle}</strong> is happening tomorrow.</p><p><strong>Date:</strong> ${opts.eventDate}<br/><strong>Venue:</strong> ${opts.venue}</p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendBlacklistNotification(opts: {
  to: string; name: string; reason: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: 'GovEvent: Registration access restricted',
      html: `<p>Hi ${opts.name},</p><p>Your account has been restricted from registering for events. Reason: ${opts.reason}</p><p>Please contact your event coordinator to resolve this.</p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendCancellationEmail(opts: {
  to: string; name: string; eventTitle: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `Cancelled: ${opts.eventTitle}`,
      html: `<p>Hi ${opts.name},</p><p>We regret to inform you that <strong>${opts.eventTitle}</strong> has been cancelled. We apologise for any inconvenience caused.</p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function sendBroadcastEmail(opts: {
  to: string; name: string; eventTitle: string; subject: string; message: string
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `${opts.subject} — ${opts.eventTitle}`,
      html: `<p>Hi ${opts.name},</p><p>${opts.message.replace(/\n/g, '<br/>')}</p><p>GovEvent Team</p>`,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}
