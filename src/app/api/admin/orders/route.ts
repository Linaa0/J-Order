import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const params = req.nextUrl.searchParams
  const page = Math.max(1, Number(params.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 25)))
  const status = params.get('status')
  const paymentStatus = params.get('paymentStatus')
  const search = params.get('search')?.trim()
  const from = params.get('from')
  const to = params.get('to')
  const where = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as 'PAID' | 'NOT_PAID' } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) } } : {}),
    ...(search ? { OR: [
      { orderNumber: { contains: search, mode: 'insensitive' as const } },
      { purchaseCode: { contains: search, mode: 'insensitive' as const } },
      { client: { name: { contains: search, mode: 'insensitive' as const } } },
    ] } : {}),
  }
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        items: true,
        client: { select: { id: true, name: true, phone: true } },
        group: { select: { id: true, reference: true, type: true, truckCapacity: true } },
      },
    }),
    prisma.order.count({ where }),
  ])
  return NextResponse.json({ data: orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}
