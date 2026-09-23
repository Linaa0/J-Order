import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'
import { z } from 'zod'
import { OrderStatus, UserRole } from '@prisma/client'

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

    const orderNumber = generateOrderNumber()

    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId,
        isGuestOrder,
        guestPhone: data.guestPhone,
        deliveryAddress: data.deliveryAddress,
        deliveryLat: data.deliveryLat,
        deliveryLng: data.deliveryLng,
        preferredDate: new Date(data.preferredDate),
        preferredTime: data.preferredTime,
        notes: data.notes,
        syncedAt: new Date(),
        items: {
          create: data.items.map((item) => ({
            product: item.product,
            quantity: item.quantity,
          })),
        },
        statusHistory: {
          create: {
            changedBy: clientId,
            newStatus: OrderStatus.PENDING,
          },
        },
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
    if (product) where.items = { some: { product } }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          items: true,
          client: { select: { id: true, name: true, phone: true } },
          assignedTo: { select: { id: true, name: true, phone: true } },
          _count: { select: { statusHistory: true } },
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
