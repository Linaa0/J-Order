import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sanitizePhone } from '@/lib/utils'

const schema = z.object({
  phone: z.string().min(10).max(15),
})

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const phone = sanitizePhone(parsed.data.phone)
    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    let user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      user = await prisma.user.create({
        data: { phone, role: 'CLIENT', preferredLanguage: 'en' },
      })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
    }

    await prisma.otpCode.deleteMany({
      where: { userId: user.id, used: false },
    })

    await prisma.otpCode.create({
      data: { userId: user.id, code: otp, expiresAt },
    })

    if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
      const AfricasTalking = require('africastalking')
      const at = AfricasTalking({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME,
      })
      const sms = at.SMS
      try {
        await sms.send({
          to: [phone],
          message: `Your J Order verification code is: ${otp}. Valid for 10 minutes.`,
          from: process.env.AT_SENDER_ID,
        })
      } catch (smsError) {
        console.error('SMS send error:', smsError)
      }
    } else {
      console.log(`[DEV] OTP for ${phone}: ${otp}`)
    }

    return NextResponse.json({
      message: 'Code sent',
      isNewUser: !user.name,
      ...(process.env.NODE_ENV === 'development' ? { otp } : {}),
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
