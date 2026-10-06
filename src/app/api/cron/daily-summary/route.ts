import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildDailySummary, formatDailySummary, getKigaliHour } from '@/lib/daily-summary'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const settings = await prisma.appSetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })
  if (getKigaliHour() < settings.dailySummaryHour) return NextResponse.json({ message: 'Summary time has not arrived' })
  const summary = await buildDailySummary(new Date())
  const payload = JSON.parse(JSON.stringify(summary)) as Prisma.InputJsonValue
  const claimed = await prisma.dailyOrderSummary.createMany({ data: [{ summaryDate: summary.summaryDate, payload }] , skipDuplicates: true })
  if (!claimed.count) return NextResponse.json({ message: 'Summary already sent or claimed' })

  const text = formatDailySummary(summary)
  const failures: string[] = []
  if (settings.adminEmail && process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.RESEND_FROM, to: [settings.adminEmail], subject: `J Order daily summary ${summary.summaryDate.toISOString().slice(0, 10)}`, text }),
      })
      if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`)
      await prisma.dailyOrderSummary.update({ where: { summaryDate: summary.summaryDate }, data: { emailAttemptedAt: new Date() } })
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'Email send failed')
    }
  }
  if (settings.adminPhone && process.env.AT_API_KEY && process.env.AT_USERNAME && process.env.AT_SENDER_ID) {
    try {
      const africastalking = (await import('africastalking')).default
      const at = africastalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME })
      const response = await at.SMS.send({ to: [settings.adminPhone], message: `J Order: ${summary.totalOrders} orders. Paid ${summary.paidOrders}. Not paid ${summary.unpaidOrders}.`, from: process.env.AT_SENDER_ID }) as {
        SMSMessageData?: { Recipients?: Array<{ statusCode?: number }> }
      }
      const recipients = response.SMSMessageData?.Recipients ?? []
      if (!recipients.length || recipients.some((recipient) => recipient.statusCode !== 101)) throw new Error('SMS provider did not accept the summary')
      await prisma.dailyOrderSummary.update({ where: { summaryDate: summary.summaryDate }, data: { smsAttemptedAt: new Date() } })
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'SMS send failed')
    }
  }
  return NextResponse.json({ data: { summary, failures } })
}
