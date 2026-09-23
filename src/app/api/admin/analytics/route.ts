import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalOrders,
    ordersToday,
    completedOrders,
    cancelledOrders,
    productCounts,
    dailyOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { status: { in: ['DELIVERED', 'COMPLETED'] } } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
    prisma.orderItem.groupBy({
      by: ['product'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
    }),
    prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM orders
      WHERE created_at >= ${startOf30Days}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  ])

  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  return NextResponse.json({
    data: {
      totalOrders,
      ordersToday,
      completedOrders,
      cancelledOrders,
      completionRate,
      productCounts,
      dailyOrders,
    },
  })
}
