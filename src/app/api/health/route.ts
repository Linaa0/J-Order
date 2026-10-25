import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  let dbStatus: 'ok' | 'not ok' = 'not ok'

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'ok'
  } catch (error) {
    console.error('[Health Check] Database connectivity check failed:', error)
    dbStatus = 'not ok'
  }

  const hasEmail = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
  const hasSms = Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME && process.env.AT_SENDER_ID)
  const hasAuth = Boolean(process.env.NEXTAUTH_SECRET && (process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET))

  const overallOk = dbStatus === 'ok' && hasAuth

  return NextResponse.json(
    {
      status: overallOk ? 'ok' : 'degraded',
      database: dbStatus,
      emailProvider: hasEmail ? 'ok' : 'not ok',
      smsProvider: hasSms ? 'ok' : 'not ok',
      auth: hasAuth ? 'ok' : 'not ok',
    },
    {
      status: overallOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
