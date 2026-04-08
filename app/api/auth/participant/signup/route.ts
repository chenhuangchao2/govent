import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, organisation } = await req.json()

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { data: null, error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { data: null, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { data: null, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const existing = await db.participant.findUnique({ where: { email } })

    if (existing && existing.isVerified) {
      return NextResponse.json(
        { data: null, error: 'Account already exists' },
        { status: 409 }
      )
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const passwordHash = createHash('sha256').update(password).digest('hex')

    if (existing && !existing.isVerified) {
      // Update existing unverified account
      await db.participant.update({
        where: { email },
        data: { passwordHash, name, organisation: organisation || undefined, verificationCode, codeExpiresAt },
      })
    } else {
      // Create new participant
      await db.participant.create({
        data: {
          email,
          name,
          organisation: organisation || null,
          passwordHash,
          isVerified: false,
          verificationCode,
          codeExpiresAt,
        },
      })
    }

    // Send verification email
    const fromAddress = process.env.RESEND_FROM || 'GovEvent <onboarding@resend.dev>'
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'GovEvent - Verify your email',
      html: `<p>Your verification code is: <strong>${verificationCode}</strong></p><p>This code expires in 10 minutes.</p>`,
    })

    return NextResponse.json({ data: { message: 'Verification code sent' }, error: null })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
