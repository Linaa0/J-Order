import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildDailySummary } from '@/lib/daily-summary'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const dateParam = req.nextUrl.searchParams.get('date')
  const date = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date()
  const summary = await buildDailySummary(date)
  const previous = await prisma.dailyOrderSummary.findMany({
    orderBy: { summaryDate: 'desc' },
    take: 30,
    select: { summaryDate: true, payload: true },
  })
  return NextResponse.json({ data: { current: summary, history: previous } })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const current = await prisma.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })

  const settings = await prisma.appSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      consolidationSizeKg: Number(body.consolidationSizeKg ?? current.consolidationSizeKg),
      maxConsolidationDistanceKm: Number(body.maxConsolidationDistanceKm ?? current.maxConsolidationDistanceKm),
      maxConsolidationWaitHours: Number(body.maxConsolidationWaitHours ?? current.maxConsolidationWaitHours),
      dailySummaryHour: Number(body.dailySummaryHour ?? current.dailySummaryHour),
      adminEmail: body.adminEmail ?? current.adminEmail ?? null,
      adminPhone: body.adminPhone ?? current.adminPhone ?? null,
    },
    update: {
      consolidationSizeKg: Number(body.consolidationSizeKg ?? current.consolidationSizeKg),
      maxConsolidationDistanceKm: Number(body.maxConsolidationDistanceKm ?? current.maxConsolidationDistanceKm),
      maxConsolidationWaitHours: Number(body.maxConsolidationWaitHours ?? current.maxConsolidationWaitHours),
      dailySummaryHour: Number(body.dailySummaryHour ?? current.dailySummaryHour),
      adminEmail: body.adminEmail ?? current.adminEmail ?? null,
      adminPhone: body.adminPhone ?? current.adminPhone ?? null,
    },
  })
  return NextResponse.json({ data: settings })
}
