import { OrderStatus, ProductCategory } from '@prisma/client'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
]

export const PRODUCT_LABELS: Record<ProductCategory, string> = {
  GAS_REFILL: 'Gas Refill (LPG)',
  CYLINDER_6KG: '6 Kg Cylinder',
  CYLINDER_12KG: '12 Kg Cylinder',
  CYLINDER_20KG: '20 Kg Cylinder',
  CYLINDER_38KG: '38 Kg Cylinder',
}

export function getStatusStep(status: OrderStatus): number {
  const idx = ORDER_STATUS_STEPS.indexOf(status)
  return idx === -1 ? 0 : idx
}

export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    PROCESSING: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
    OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.COMPLETED],
    DELIVERED: [OrderStatus.COMPLETED],
    COMPLETED: [],
    CANCELLED: [],
  }
  return transitions[from]?.includes(to) ?? false
}
