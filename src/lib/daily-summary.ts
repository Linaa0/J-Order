import { OrderStatus, ProductCategory } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PRODUCT_LABELS } from '@/lib/order-utils'

const TIME_ZONE = 'Africa/Kigali'

export function getKigaliDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) }
}

export function getKigaliHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(date))
}

export function getSummaryWindow(date: Date) {
  const { year, month, day } = getKigaliDateParts(date)
  const start = new Date(Date.UTC(year, month - 1, day) - 2 * 60 * 60 * 1000)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000), summaryDate: new Date(Date.UTC(year, month - 1, day)) }
}

export async function buildDailySummary(date: Date) {
  const { start, end, summaryDate } = getSummaryWindow(date)
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { status: true, paymentStatus: true, items: { select: { product: true, quantity: true } } },
  })
  const statusCounts = Object.fromEntries(Object.values(OrderStatus).map((status) => [status, 0])) as Record<OrderStatus, number>
  const productTotals = Object.fromEntries(Object.values(ProductCategory).map((product) => [product, 0])) as Record<ProductCategory, number>
  let paid = 0
  for (const order of orders) {
    statusCounts[order.status] += 1
    if (order.paymentStatus === 'PAID') paid += 1
    for (const item of order.items) productTotals[item.product] += item.quantity
  }
  return {
    summaryDate,
    totalOrders: orders.length,
    statusCounts,
    productTotals,
    productLabels: PRODUCT_LABELS,
    paidOrders: paid,
    unpaidOrders: orders.length - paid,
  }
}

export function formatDailySummary(summary: Awaited<ReturnType<typeof buildDailySummary>>) {
  const statusLines = Object.entries(summary.statusCounts).filter(([, count]) => count > 0).map(([status, count]) => `${status.replaceAll('_', ' ')}: ${count}`)
  const productLines = Object.entries(summary.productTotals).filter(([, quantity]) => quantity > 0).map(([product, quantity]) => `${summary.productLabels[product as ProductCategory]}: ${quantity}`)
  return [
    `J Order daily summary for ${summary.summaryDate.toISOString().slice(0, 10)}`,
    `Orders placed: ${summary.totalOrders}`,
    `Paid: ${summary.paidOrders}   Not paid: ${summary.unpaidOrders}`,
    'Orders by status:',
    ...(statusLines.length ? statusLines : ['No orders']),
    'Quantity by product:',
    ...(productLines.length ? productLines : ['No items']),
  ].join('\n')
}
