import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword, action } = await req.json()

    if (action === 'send-code') {
      // Step 1: Send reset code
      if (!email) {
        return NextResponse.json({ data: null, error: 'Email is required' }, { status: 400 })
      }

      const participant = await db.participant.findUnique({ where: { email } })
      if (!participant || !participant.isVerified) {
        // Don't reveal whether account exists
        return NextResponse.json({ data: { message: 'If an account exists, a reset code has been sent.' }, error: null })
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      await db.participant.update({
        where: { email },
        data: { verificationCode, codeExpiresAt },
      })

      const fromAddress = process.env.RESEND_FROM || 'GovEvent <onboarding@resend.dev>'
      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: 'GovEvent - Password Reset Code',
        html: `<p>Your password reset code is: <strong>${verificationCode}</strong></p><p>This code expires in 10 minutes. If you did not request this, please ignore this email.</p>`,
      })

      return NextResponse.json({ data: { message: 'If an account exists, a reset code has been sent.' }, error: null })
    }

    if (action === 'reset') {
      // Step 2: Verify code and reset password
      if (!email || !code || !newPassword) {
        return NextResponse.json({ data: null, error: 'Email, code, and new password are required' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ data: null, error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      const participant = await db.participant.findUnique({ where: { email } })
      if (!participant || !participant.verificationCode || !participant.codeExpiresAt) {
        return NextResponse.json({ data: null, error: 'Invalid or expired reset code' }, { status: 400 })
      }

      if (participant.verificationCode !== code || new Date() > participant.codeExpiresAt) {
        return NextResponse.json({ data: null, error: 'Invalid or expired reset code' }, { status: 400 })
      }

      const passwordHash = createHash('sha256').update(newPassword).digest('hex')
      await db.participant.update({
        where: { email },
        data: { passwordHash, verificationCode: null, codeExpiresAt: null },
      })

      return NextResponse.json({ data: { message: 'Password reset successfully' }, error: null })
    }

    return NextResponse.json({ data: null, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
