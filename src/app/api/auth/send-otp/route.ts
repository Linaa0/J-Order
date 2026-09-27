import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sanitizePhone } from '@/lib/utils'
import { detectContactType, normalizeEmail, normalizePhone } from '@/lib/contact'

const schema = z.object({
  contact: z.string().min(4).max(255).optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  contactType: z.enum(['email', 'phone']).optional(),
  deliveryMethod: z.enum(['sms', 'whatsapp']).optional(),
})

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendEmailOtp(email: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'

  if (!apiKey) {
    console.log(`[DEV] OTP for ${email}: ${otp}`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your J Order verification code',
      html: `<p>Your J Order verification code is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
      text: `Your J Order verification code is ${otp}. It is valid for 10 minutes.`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email send failed: ${text}`)
  }
}

async function sendSmsOtp(phone: string, otp: string, deliveryMethod: 'sms' | 'whatsapp' = 'sms') {
  if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
    const africastalking = (await import('africastalking')).default
    const at = africastalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    })

    if (deliveryMethod === 'whatsapp') {
      try {
        const whatsapp = (at as { WhatsApp?: { send: (payload: { to: string[]; message: string }) => Promise<unknown> } }).WhatsApp
        if (whatsapp) {
          await whatsapp.send({
            to: [phone],
            message: `Your J Order verification code is ${otp}. Valid for 10 minutes.`,
          })
          return
        }
      } catch (error) {
        console.warn('WhatsApp delivery failed, falling back to SMS', error)
      }
    }

    try {
      await at.SMS.send({
        to: [phone],
        message: `Your J Order verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.AT_SENDER_ID,
      })
      return
    } catch (smsError) {
      if (deliveryMethod === 'whatsapp') {
        console.warn('WhatsApp failed and SMS also failed', smsError)
        throw smsError
      }
      console.error('SMS send error:', smsError)
      throw smsError
    }
  }

  console.log(`[DEV] OTP for ${phone}: ${otp}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid contact details' }, { status: 400 })
    }

    const preferredContact = parsed.data.contact ?? parsed.data.email ?? parsed.data.phone
    const type = parsed.data.contactType ?? detectContactType(String(preferredContact || ''))

    if (!preferredContact) {
      return NextResponse.json({ error: 'Contact is required' }, { status: 400 })
    }

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    if (type === 'email') {
      const email = normalizeEmail(preferredContact)

      let user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        user = await prisma.user.create({
          data: { email, phone: `+250000000000`, role: 'CLIENT', preferredLanguage: 'en' },
        })
      }

      if (!user.isActive) {
        return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
      }

      await prisma.otpCode.deleteMany({ where: { userId: user.id, used: false } })
      await prisma.otpCode.create({ data: { userId: user.id, code: otp, expiresAt } })
      await sendEmailOtp(email, otp)

      return NextResponse.json({
        message: 'Code sent',
        isNewUser: !user.name,
        ...(process.env.NODE_ENV === 'development' ? { otp } : {}),
      })
    }

    const phone = normalizePhone(preferredContact)
    const safePhone = sanitizePhone(phone)
    let user = await prisma.user.findUnique({ where: { phone: safePhone } })
    if (!user) {
      user = await prisma.user.create({
        data: { phone: safePhone, role: 'CLIENT', preferredLanguage: 'en' },
      })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
    }

    await prisma.otpCode.deleteMany({ where: { userId: user.id, used: false } })
    await prisma.otpCode.create({ data: { userId: user.id, code: otp, expiresAt } })

    const delivery = parsed.data.deliveryMethod ?? 'sms'
    try {
      await sendSmsOtp(safePhone, otp, delivery)
    } catch (error) {
      if (delivery === 'whatsapp') {
        console.warn('WhatsApp attempt failed, retrying with SMS fallback', error)
        await sendSmsOtp(safePhone, otp, 'sms')
      } else {
        throw error
      }
    }

    return NextResponse.json({
      message: 'Code sent',
      isNewUser: !user.name,
      deliveryMethod: delivery === 'whatsapp' ? 'whatsapp' : 'sms',
      ...(process.env.NODE_ENV === 'development' ? { otp } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Send OTP error:', error)

    if (
      message.includes('ECONNREFUSED') ||
      message.includes('database') ||
      message.includes('connect') ||
      message.includes('P1001')
    ) {
      return NextResponse.json(
        { error: 'Database connection unavailable. Start PostgreSQL and run the project migrations.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
