export type { User, Order, OrderItem, OrderStatusHistory, Notification, Truck, DeliveryTrip } from '@prisma/client'
export { UserRole, ProductCategory, OrderStatus, NotificationChannel, PaymentStatus, PaymentMethod, TruckStatus } from '@prisma/client'

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface OrderWithDetails {
  id: string
  orderNumber: string
  purchaseCode: string
  status: import('@prisma/client').OrderStatus
  paymentStatus: import('@prisma/client').PaymentStatus
  amountDue: number | null
  amountPaid: number
  tinNumber: string | null
  companyName: string | null
  truckCapacity: string | null
  groupId: string | null
  tripId: string | null
  group?: {
    id: string
    reference: string
    type: import('@prisma/client').OrderGroupType
    truckCapacity: string | null
  } | null
  deliveryAddress: string
  deliveryLat: number | null
  deliveryLng: number | null
  preferredDate: Date
  preferredTime: string
  notes: string | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
  client: { id: string; name: string | null; phone: string | null; email?: string | null }
  assignedTo: { id: string; name: string | null; phone: string | null } | null
  items: Array<{
    id: string
    product: import('@prisma/client').ProductCategory
    quantity: number
    unitPrice: number | null
  }>
  statusHistory: Array<{
    id: string
    oldStatus: import('@prisma/client').OrderStatus | null
    newStatus: import('@prisma/client').OrderStatus
    reason: string | null
    createdAt: Date
    user: { id: string; name: string | null; role: import('@prisma/client').UserRole }
  }>
  paymentHistory?: Array<{
    id: string
    oldStatus: import('@prisma/client').PaymentStatus | null
    newStatus: import('@prisma/client').PaymentStatus
    method: import('@prisma/client').PaymentMethod | null
    amountPaid: number
    reference: string | null
    note: string | null
    createdAt: Date
    recorder: { id: string; name: string | null }
  }>
}

export interface OfflineOrder {
  localId: string
  items: Array<{ product: string; quantity: number }>
  deliveryAddress: string
  deliveryLat?: number
  deliveryLng?: number
  preferredDate: string
  preferredTime: string
  notes?: string
  guestPhone?: string
  tinNumber?: string
  companyName?: string
  createdAt: string
  synced: boolean
  syncAttempts: number
}
