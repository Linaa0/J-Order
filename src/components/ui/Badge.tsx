import { cn } from '@/lib/utils'
import { OrderStatus } from '@prisma/client'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border border-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border border-blue-200',
  PROCESSING: 'bg-purple-100 text-purple-800 border border-purple-200',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800 border border-orange-200',
  DELIVERED: 'bg-green-100 text-green-800 border border-green-200',
  COMPLETED: 'bg-teal-100 text-teal-800 border border-teal-200',
  CANCELLED: 'bg-red-100 text-red-800 border border-red-200',
}

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
        statusStyles[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  )
}
