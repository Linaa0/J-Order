import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateOrderWeight, distanceKm, suggestTruckCapacity, TRUCK_CAPACITY_KG } from '@/lib/order-operations'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const [settings, orders] = await Promise.all([
    prisma.appSetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
    prisma.order.findMany({
      where: { status: 'AWAITING_CONSOLIDATION', groupId: null },
      orderBy: { createdAt: 'asc' },
      include: { items: true, client: { select: { name: true, phone: true } } },
    }),
  ])
  const clusters: Array<{ key: string; center: { lat: number; lng: number }; orders: typeof orders; weightKg: number; suggestedTruck: string | null; hasEscalated: boolean }> = []
  const missingCoordinates: typeof orders = []
  const escalatedBefore = Date.now() - settings.maxConsolidationWaitHours * 60 * 60 * 1000
  for (const order of orders) {
    if (order.deliveryLat == null || order.deliveryLng == null) {
      missingCoordinates.push(order)
      continue
    }
    const cluster = clusters.find((candidate) => distanceKm(candidate.center, { lat: order.deliveryLat!, lng: order.deliveryLng! }) <= settings.maxConsolidationDistanceKm)
    if (cluster) cluster.orders.push(order)
    else clusters.push({ key: order.deliveryAddress.slice(0, 70), center: { lat: order.deliveryLat, lng: order.deliveryLng }, orders: [order], weightKg: 0, suggestedTruck: null, hasEscalated: false })
  }
  for (const cluster of clusters) {
    cluster.weightKg = cluster.orders.reduce((sum, order) => sum + calculateOrderWeight(order.items), 0)
    cluster.suggestedTruck = suggestTruckCapacity(cluster.weightKg)
    cluster.hasEscalated = cluster.orders.some((order) => order.createdAt.getTime() <= escalatedBefore)
  }
  return NextResponse.json({ data: { clusters, missingCoordinates, settings } })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const orderIds = Array.isArray(body.orderIds) ? [...new Set(body.orderIds.filter((id: unknown) => typeof id === 'string'))] as string[] : []
  if (orderIds.length < 2) return NextResponse.json({ error: 'Select at least two orders' }, { status: 400 })
  const [settings, orders] = await Promise.all([
    prisma.appSetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
    prisma.order.findMany({ where: { id: { in: orderIds }, status: 'AWAITING_CONSOLIDATION', groupId: null }, include: { items: true } }),
  ])
  if (orders.length !== orderIds.length) return NextResponse.json({ error: 'Some selected orders are no longer awaiting consolidation' }, { status: 409 })
  if (orders.some((order) => order.deliveryLat == null || order.deliveryLng == null)) {
    return NextResponse.json({ error: 'Every order needs map coordinates before it can be consolidated' }, { status: 422 })
  }
  const points = orders.map((order) => ({ lat: order.deliveryLat!, lng: order.deliveryLng! }))
  const furthestDistance = Math.max(...points.flatMap((point, index) => points.slice(index + 1).map((other) => distanceKm(point, other))))
  if (furthestDistance > settings.maxConsolidationDistanceKm) {
    return NextResponse.json({ error: `Selected orders are ${furthestDistance.toFixed(1)} km apart, beyond the ${settings.maxConsolidationDistanceKm} km limit` }, { status: 422 })
  }
  const weightKg = orders.reduce((sum, order) => sum + calculateOrderWeight(order.items), 0)
  const suggested = suggestTruckCapacity(weightKg)
  const capacity = body.truckCapacity || suggested
  if (!capacity || !(capacity in TRUCK_CAPACITY_KG)) return NextResponse.json({ error: 'Choose a truck capacity for this load' }, { status: 400 })
  if (weightKg > TRUCK_CAPACITY_KG[capacity as keyof typeof TRUCK_CAPACITY_KG]) {
    return NextResponse.json({ error: 'The selected truck is too small for this load' }, { status: 422 })
  }
  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.orderGroup.create({ data: { reference: `CON${Date.now().toString(36).toUpperCase()}`, type: 'CONSOLIDATION', truckCapacity: capacity } })
    for (const order of orders) {
      await tx.order.update({ where: { id: order.id }, data: { groupId: createdGroup.id, truckCapacity: capacity, status: 'OUT_FOR_DELIVERY' } })
      await tx.orderStatusHistory.create({ data: { orderId: order.id, changedBy: session.user.id, oldStatus: 'AWAITING_CONSOLIDATION', newStatus: 'OUT_FOR_DELIVERY', reason: `Dispatched in ${createdGroup.reference}` } })
    }
    await tx.orderGroup.update({ where: { id: createdGroup.id }, data: { dispatchedAt: new Date() } })
    return createdGroup
  })
  return NextResponse.json({ data: { group, weightKg, capacity, suggested } }, { status: 201 })
}
