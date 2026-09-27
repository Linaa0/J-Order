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

function getMessagingConfig() {
  return {
    emailApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.RESEND_FROM,
    atApiKey: process.env.AT_API_KEY,
    atUsername: process.env.AT_USERNAME,
    atSmsSender: process.env.AT_SENDER_ID,
    atWhatsappNumber: process.env.AT_WHATSAPP_NUMBER || process.env.AT_SENDER_ID,
  }
}

function logDebugOtp(label: string, otp: string, target: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[DEV OTP DEBUG] ${label} ${target}: ${otp}`)
  }
}

async function sendEmailOtp(email: string, otp: string) {
  const { emailApiKey, emailFrom } = getMessagingConfig()

  if (!emailApiKey || !emailFrom) {
    throw new Error('Email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM in .env.local or the runtime environment.')
  }

  logDebugOtp('generated email code for', otp, email)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${emailApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [email],
      subject: 'Your J Order verification code',
      html: `<p>Your J Order verification code is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
      text: `Your J Order verification code is ${otp}. It is valid for 10 minutes.`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email provider rejected the request: ${text}`)
  }
}

async function sendSmsOtp(phone: string, otp: string) {
  const { atApiKey, atUsername, atSmsSender } = getMessagingConfig()

  if (!atApiKey || !atUsername || !atSmsSender) {
    throw new Error('SMS delivery is not configured. Add AT_API_KEY, AT_USERNAME, and AT_SENDER_ID in .env.local or the runtime environment.')
  }

  logDebugOtp('generated SMS code for', otp, phone)

  const africastalking = (await import('africastalking')).default
  const at = africastalking({
    apiKey: atApiKey,
    username: atUsername,
  })

  const response = await at.SMS.send({
    to: [phone],
    message: `Your J Order verification code is: ${otp}. Valid for 10 minutes.`,
    from: atSmsSender,
  })

  return response
}

async function sendWhatsAppOtp(phone: string, otp: string) {
  const { atApiKey, atUsername, atWhatsappNumber } = getMessagingConfig()

  if (!atApiKey || !atUsername || !atWhatsappNumber) {
    throw new Error('WhatsApp delivery is not configured. Add AT_API_KEY, AT_USERNAME, and AT_WHATSAPP_NUMBER in .env.local or the runtime environment.')
  }

  logDebugOtp('generated WhatsApp code for', otp, phone)

  const africastalking = (await import('africastalking')).default
  const at = africastalking({
    apiKey: atApiKey,
    username: atUsername,
  })

  const whatsapp = (at as { WhatsApp?: { send: (payload: { to: string[]; message: string }) => Promise<unknown> } }).WhatsApp

  if (!whatsapp) {
    throw new Error('WhatsApp delivery is not supported by the configured Africa\'s Talking client.')
  }

  const response = await whatsapp.send({
    to: [phone],
    message: `Your J Order verification code is ${otp}. Valid for 10 minutes.`,
  })

  return response
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
        message: 'Code sent via email',
        channel: 'email',
        isNewUser: !user.name,
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

    let usedChannel: 'sms' | 'whatsapp' = 'sms'

    try {
      if (delivery === 'whatsapp') {
        await sendWhatsAppOtp(safePhone, otp)
        usedChannel = 'whatsapp'
      } else {
        await sendSmsOtp(safePhone, otp)
      }
    } catch (error) {
      const whatsappError = error instanceof Error ? error : new Error(String(error))
      console.error('Primary delivery failed:', whatsappError)

      if (delivery === 'whatsapp') {
        console.warn('WhatsApp delivery failed, retrying via SMS as fallback.')
        try {
          await sendSmsOtp(safePhone, otp)
          usedChannel = 'sms'
        } catch (smsError) {
          const smsFailure = smsError instanceof Error ? smsError : new Error(String(smsError))
          console.error('SMS fallback failed:', smsFailure)
          throw new Error(`WhatsApp delivery failed and SMS fallback also failed. ${smsFailure.message}`)
        }
      } else {
        throw error
      }
    }

    return NextResponse.json({
      message: `Code sent via ${usedChannel}`,
      channel: usedChannel,
      isNewUser: !user.name,
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

    if (message.includes('not configured') || message.includes('rejected the request') || message.includes('failed and SMS fallback')) {
      return NextResponse.json({ error: message }, { status: 503 })
    }

    return NextResponse.json({ error: 'Failed to send code. Please try again or choose another delivery method.' }, { status: 500 })
  }
}
