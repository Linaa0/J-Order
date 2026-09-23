import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { canTransitionTo } from '@/lib/order-utils'
import { OrderStatus } from '@prisma/client'

const statusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED']),
  reason: z.string().max(500).optional(),
  assignedToId: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        client: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true, phone: true } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const role = session.user.role
    if (
      role === 'CLIENT' &&
      order.clientId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (role === 'TECHNICIAN' && order.assignedToId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = statusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { status, reason, assignedToId } = parsed.data

    if (!canTransitionTo(order.status, status as OrderStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${status}` },
        { status: 422 }
      )
    }

    if (status === 'CANCELLED' && !reason) {
      return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          status: status as OrderStatus,
          ...(reason ? { cancellationReason: reason } : {}),
          ...(assignedToId ? { assignedToId } : {}),
        },
        include: {
          items: true,
          client: { select: { id: true, name: true, phone: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      })

      await tx.orderStatusHistory.create({
        data: {
          orderId: params.id,
          changedBy: session.user.id,
          oldStatus: order.status,
          newStatus: status as OrderStatus,
          reason,
        },
      })

      return updatedOrder
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
