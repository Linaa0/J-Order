import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const paymentSchema = z.object({
  orderId: z.string().cuid(),
  method: z.enum(['MTN_MOMO', 'AIRTEL_MONEY', 'CASH', 'BANK_TRANSFER']),
  amountPaid: z.number().positive(),
  reference: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'ORDER_STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { orderId, method, amountPaid, reference, note } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, paymentStatus: true, amountDue: true, amountPaid: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const newAmountPaid = Number(order.amountPaid) + amountPaid
  const amountDue = order.amountDue ? Number(order.amountDue) : null
  let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'
  if (amountDue !== null) {
    if (newAmountPaid >= amountDue) newStatus = 'PAID'
    else if (newAmountPaid > 0) newStatus = 'PARTIAL'
  } else {
    newStatus = 'PAID'
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: newStatus, amountPaid: newAmountPaid },
    })
    await tx.paymentHistory.create({
      data: {
        orderId,
        recordedBy: session.user.id,
        oldStatus: order.paymentStatus as 'UNPAID' | 'PARTIAL' | 'PAID',
        newStatus,
        method,
        amountPaid,
        reference,
        note,
      },
    })
    return updated
  })

  return NextResponse.json({ data: result })
}
