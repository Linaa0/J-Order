import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber, generatePurchaseCode } from '@/lib/utils'
import { z } from 'zod'
import { OrderStatus, UserRole } from '@prisma/client'
import { calculateOrderWeight } from '@/lib/order-operations'

const orderSchema = z.object({
  items: z.array(
    z.object({
      product: z.enum(['GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG']),
      quantity: z.number().int().min(1).max(100),
    })
  ).min(1),
  deliveryAddress: z.string().min(5).max(500),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  preferredDate: z.string(),
  preferredTime: z.string(),
  notes: z.string().max(500).optional(),
  guestPhone: z.string().optional(),
  tinNumber: z.string().trim().max(32).optional(),
  orderMode: z.enum(['SINGLE', 'GROUPED']).optional(),
  groupItems: z.array(z.object({
    items: z.array(z.object({
      product: z.enum(['GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG']),
      quantity: z.number().int().min(1).max(100),
    })).min(1),
    deliveryAddress: z.string().min(5).max(500),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    preferredDate: z.string(),
    preferredTime: z.string(),
    notes: z.string().max(500).optional(),
  })).min(2).max(20).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    const parsed = orderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const settings = await prisma.appSetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })
    let clientId: string
    let isGuestOrder = false

    if (session?.user) {
      clientId = session.user.id
    } else if (data.guestPhone) {
      const { sanitizePhone } = await import('@/lib/utils')
      const phone = sanitizePhone(data.guestPhone)
      let guest = await prisma.user.findUnique({ where: { phone } })
      if (!guest) {
        guest = await prisma.user.create({
          data: { phone, role: UserRole.CLIENT, isGuest: true, preferredLanguage: 'en' },
        })
      }
      clientId = guest.id
      isGuestOrder = true
    } else {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const createOrderData = (line: {
      items: Array<{ product: string; quantity: number }>
      deliveryAddress: string
      deliveryLat?: number
      deliveryLng?: number
      preferredDate: string
      preferredTime: string
      notes?: string
    }) => ({
      orderNumber: generateOrderNumber(),
      purchaseCode: generatePurchaseCode(),
      clientId,
      isGuestOrder,
      guestPhone: data.guestPhone,
      tinNumber: data.tinNumber || null,
      deliveryAddress: line.deliveryAddress,
      deliveryLat: line.deliveryLat,
      deliveryLng: line.deliveryLng,
      preferredDate: new Date(line.preferredDate),
      preferredTime: line.preferredTime,
      notes: line.notes,
      syncedAt: new Date(),
      items: { create: line.items.map((item) => ({ product: item.product as 'GAS_REFILL' | 'CYLINDER_6KG' | 'CYLINDER_12KG' | 'CYLINDER_20KG' | 'CYLINDER_38KG', quantity: item.quantity })) },
      status: data.orderMode !== 'GROUPED' && calculateOrderWeight(line.items as Array<{ product: 'GAS_REFILL' | 'CYLINDER_6KG' | 'CYLINDER_12KG' | 'CYLINDER_20KG' | 'CYLINDER_38KG'; quantity: number }>) < settings.consolidationSizeKg
        ? OrderStatus.AWAITING_CONSOLIDATION
        : OrderStatus.PENDING,
      statusHistory: { create: { changedBy: clientId, newStatus: data.orderMode !== 'GROUPED' && calculateOrderWeight(line.items as Array<{ product: 'GAS_REFILL' | 'CYLINDER_6KG' | 'CYLINDER_12KG' | 'CYLINDER_20KG' | 'CYLINDER_38KG'; quantity: number }>) < settings.consolidationSizeKg ? OrderStatus.AWAITING_CONSOLIDATION : OrderStatus.PENDING } },
    })

    if (data.orderMode === 'GROUPED') {
      if (!data.groupItems || data.groupItems.length < 2) {
        return NextResponse.json({ error: 'A grouped order needs at least two delivery stops' }, { status: 400 })
      }
      const group = await prisma.$transaction(async (tx) => {
        const createdGroup = await tx.orderGroup.create({
          data: { reference: `GRP${generatePurchaseCode()}`, type: 'CUSTOMER_GROUP' },
        })
        const orders = []
        for (const line of data.groupItems!) {
          orders.push(await tx.order.create({
            data: { ...createOrderData(line), groupId: createdGroup.id },
            include: { items: true, client: { select: { id: true, name: true, phone: true } } },
          }))
        }
        return { ...createdGroup, orders }
      })
      return NextResponse.json({ data: group }, { status: 201 })
    }

    const order = await prisma.order.create({
      data: {
        ...createOrderData(data),
      },
      include: {
        items: true,
        client: { select: { id: true, name: true, phone: true } },
      },
    })

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const product = searchParams.get('product')
    const paymentStatus = searchParams.get('paymentStatus')
    const search = searchParams.get('search')?.trim()
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const skip = (page - 1) * limit

    const role = session.user.role
    const where: Record<string, unknown> = {}

    if (role === 'CLIENT') {
      where.clientId = session.user.id
    } else if (role === 'ORDER_STAFF') {
      const categories = session.user.staffCategories
      if (categories.length > 0) {
        where.items = { some: { product: { in: categories } } }
      }
    } else if (role === 'TECHNICIAN') {
      where.assignedToId = session.user.id
    }

    if (status) where.status = status
    if (paymentStatus) where.paymentStatus = paymentStatus
    if (product) where.items = { some: { product } }
    if (search) where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { purchaseCode: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
    ]
    if (from || to) where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: role === 'ADMIN' ? 'asc' : 'desc' },
        include: {
          items: true,
          client: { select: { id: true, name: true, phone: true } },
          assignedTo: { select: { id: true, name: true, phone: true } },
          _count: { select: { statusHistory: true } },
          group: { select: { id: true, reference: true, type: true, truckCapacity: true } },
        },
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
