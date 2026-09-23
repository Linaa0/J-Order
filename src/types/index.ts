export type { User, Order, OrderItem, OrderStatusHistory, Notification } from '@prisma/client'
export { UserRole, ProductCategory, OrderStatus, NotificationChannel } from '@prisma/client'

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface OrderWithDetails {
  id: string
  orderNumber: string
  status: import('@prisma/client').OrderStatus
  deliveryAddress: string
  deliveryLat: number | null
  deliveryLng: number | null
  preferredDate: Date
  preferredTime: string
  notes: string | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
  client: {
    id: string
    name: string | null
    phone: string
  }
  assignedTo: {
    id: string
    name: string | null
    phone: string
  } | null
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
    user: {
      id: string
      name: string | null
      role: import('@prisma/client').UserRole
    }
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
  createdAt: string
  synced: boolean
  syncAttempts: number
}
