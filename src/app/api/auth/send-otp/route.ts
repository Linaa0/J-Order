import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
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
  return randomInt(100000, 1000000).toString()
}

async function withDeliveryTimeout<T>(promise: Promise<T>, channel: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${channel} delivery timed out. Please try again.`)), 10000)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
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

async function sendEmailOtp(email: string, otp: string) {
  const { emailApiKey, emailFrom } = getMessagingConfig()

  if (!emailApiKey || !emailFrom) {
    throw new Error('Email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM in .env.local or the runtime environment.')
  }

  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
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
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown network error'
    throw new Error(`Could not reach Resend to send the email. Check the internet connection and try again. ${detail}`)
  }

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(
      `Resend rejected the email request (HTTP ${res.status}). Check that RESEND_FROM uses a sender on a domain verified in Resend and that the API key is active. Provider response: ${detail}`
    )
  }
}

async function sendSmsOtp(phone: string, otp: string) {
  const { atApiKey, atUsername, atSmsSender } = getMessagingConfig()

  if (!atApiKey || !atUsername || !atSmsSender) {
    throw new Error('SMS delivery is not configured. Add AT_API_KEY, AT_USERNAME, and AT_SENDER_ID in .env.local or the runtime environment.')
  }

  const africastalking = (await import('africastalking')).default
  const at = africastalking({
    apiKey: atApiKey,
    username: atUsername,
  })

  let response: unknown
  try {
    response = await withDeliveryTimeout(at.SMS.send({
      to: [phone],
      message: `Your J Order verification code is: ${otp}. Valid for 10 minutes.`,
      from: atSmsSender,
    }), 'SMS')
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Provider request failed.'
    throw new Error(`SMS delivery failed. ${detail}`)
  }

  const recipients = (response as {
    SMSMessageData?: { Recipients?: Array<{ status?: string; statusCode?: number; number?: string }> }
  })?.SMSMessageData?.Recipients
  if (!recipients?.length || recipients.some((recipient) => recipient.statusCode !== 101 || recipient.status !== 'Success')) {
    throw new Error('SMS delivery failed. Africa\'s Talking did not accept the message for delivery.')
  }

  return response
}

async function sendWhatsAppOtp(phone: string, otp: string) {
  const { atApiKey, atUsername, atWhatsappNumber } = getMessagingConfig()

  if (!atApiKey || !atUsername || !atWhatsappNumber) {
    throw new Error('WhatsApp delivery is not configured. Add AT_API_KEY, AT_USERNAME, and AT_WHATSAPP_NUMBER in .env.local or the runtime environment.')
  }

  const africastalking = (await import('africastalking')).default
  const at = africastalking({
    apiKey: atApiKey,
    username: atUsername,
  })

  const whatsapp = (at as {
    WHATSAPP?: {
      sendMessage: (payload: {
        waNumber: string
        phoneNumber: string
        body: { message: string }
      }) => Promise<unknown>
    }
  }).WHATSAPP

  if (!whatsapp) {
    throw new Error('WhatsApp delivery is not supported by the configured Africa\'s Talking client.')
  }

  let response: unknown
  try {
    response = await withDeliveryTimeout(whatsapp.sendMessage({
      waNumber: atWhatsappNumber,
      phoneNumber: phone,
      body: { message: `Your J Order verification code is ${otp}. Valid for 10 minutes.` },
    }), 'WhatsApp')
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Provider request failed.'
    throw new Error(`WhatsApp delivery failed. ${detail}`)
  }

  return response
}

export async function POST(req: NextRequest) {
  let pendingOtpId: string | undefined
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
          data: { email, role: 'CLIENT', preferredLanguage: 'en' },
        })
      }

      if (!user.isActive) {
        return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
      }

      const recentCodes = await prisma.otpCode.findMany({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { createdAt: true },
      })
      if (recentCodes.length >= 5) {
        return NextResponse.json({ error: 'Too many codes requested. Please try again in an hour.' }, { status: 429 })
      }
      if (recentCodes[0] && Date.now() - recentCodes[0].createdAt.getTime() < 60 * 1000) {
        return NextResponse.json({ error: 'Please wait a minute before requesting another code.' }, { status: 429 })
      }

      const otpRecord = await prisma.otpCode.create({ data: { userId: user.id, code: otp, expiresAt } })
      pendingOtpId = otpRecord.id
      await sendEmailOtp(email, otp)
      await prisma.otpCode.updateMany({ where: { userId: user.id, used: false, id: { not: otpRecord.id } }, data: { used: true } })
      pendingOtpId = undefined

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

    const recentCodes = await prisma.otpCode.findMany({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { createdAt: true },
    })
    if (recentCodes.length >= 5) {
      return NextResponse.json({ error: 'Too many codes requested. Please try again in an hour.' }, { status: 429 })
    }
    if (recentCodes[0] && Date.now() - recentCodes[0].createdAt.getTime() < 60 * 1000) {
      return NextResponse.json({ error: 'Please wait a minute before requesting another code.' }, { status: 429 })
    }

    const otpRecord = await prisma.otpCode.create({ data: { userId: user.id, code: otp, expiresAt } })
    pendingOtpId = otpRecord.id

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
        if (whatsappError.message.includes('timed out')) throw whatsappError
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

    await prisma.otpCode.updateMany({ where: { userId: user.id, used: false, id: { not: otpRecord.id } }, data: { used: true } })
    pendingOtpId = undefined

    return NextResponse.json({
      message: `Code sent via ${usedChannel}`,
      channel: usedChannel,
      isNewUser: !user.name,
    })
  } catch (error) {
    if (pendingOtpId) {
      await prisma.otpCode.updateMany({ where: { id: pendingOtpId }, data: { used: true } }).catch((cleanupError) => {
        console.error('Failed to invalidate undelivered OTP:', cleanupError)
      })
    }
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

    if (
      message.includes('not configured') ||
      message.includes('Resend rejected') ||
      message.includes('Could not reach Resend') ||
      message.includes('failed and SMS fallback') ||
      message.includes('SMS delivery failed') ||
      message.includes('WhatsApp delivery failed')
    ) {
      return NextResponse.json({ error: message }, { status: 503 })
    }

    return NextResponse.json({ error: 'Failed to send code. Please try again or choose another delivery method.' }, { status: 500 })
  }
}
