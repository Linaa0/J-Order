import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { PRODUCT_LABELS } from '@/lib/order-utils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const status = params.get('status')
  const paymentStatus = params.get('paymentStatus')
  const from = params.get('from')
  const to = params.get('to')

  const where = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {}),
    ...(from || to ? { 
      createdAt: { 
        ...(from ? { gte: new Date(from) } : {}), 
        ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) 
      } 
    } : {}),
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      items: true,
      client: { select: { id: true, name: true, phone: true, email: true } },
      group: { select: { id: true, reference: true, type: true } },
    },
  })

  // Generate CSV
  const headers = [
    'Order Number',
    'Purchase Code',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Status',
    'Payment Status',
    'Amount Due',
    'Amount Paid',
    'TIN Number',
    'Company Name',
    'Delivery Address',
    'Preferred Date',
    'Preferred Time',
    'Items',
    'Total Items',
    'Group Reference',
    'Group Type',
    'Created At',
  ]

  const rows = orders.map((order) => {
    const items = order.items.map(item => `${item.quantity} x ${PRODUCT_LABELS[item.product]}`).join('; ')
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
    
    return [
      order.orderNumber,
      order.purchaseCode,
      order.client.name || '',
      order.client.phone || '',
      order.client.email || '',
      order.status,
      order.paymentStatus,
      order.amountDue?.toString() || '0',
      order.amountPaid.toString(),
      order.tinNumber || '',
      order.companyName || '',
      order.deliveryAddress,
      order.preferredDate.toISOString().split('T')[0],
      order.preferredTime,
      items,
      totalItems.toString(),
      order.group?.reference || '',
      order.group?.type || '',
      order.createdAt.toISOString(),
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
