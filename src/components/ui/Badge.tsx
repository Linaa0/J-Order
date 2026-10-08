import { cn } from '@/lib/utils'
import { OrderStatus, PaymentStatus } from '@prisma/client'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-navy-100 text-navy-700 border border-navy-200',
  AWAITING_CONSOLIDATION: 'bg-navy-200 text-navy-800 border border-navy-300',
  CONFIRMED: 'bg-navy-50 text-navy-800 border border-navy-200',
  PROCESSING: 'bg-navy-800 text-white border border-navy-900',
  OUT_FOR_DELIVERY: 'bg-navy-700 text-white border border-navy-800',
  DELIVERED: 'bg-navy-900 text-white border border-navy-950',
  COMPLETED: 'bg-navy-950 text-white border border-navy-950',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
}

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  AWAITING_CONSOLIDATION: 'Awaiting Consolidation',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const paymentStyles: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-50 text-red-700 border border-red-200',
  PARTIAL: 'bg-navy-100 text-navy-700 border border-navy-200',
  PAID: 'bg-navy-900 text-white border border-navy-900',
}

const paymentLabels: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIAL: 'Partial',
  PAID: 'Paid',
}

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

interface PaymentBadgeProps {
  status: PaymentStatus
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
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  )
}

export function PaymentBadge({ status, className }: PaymentBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
        paymentStyles[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {paymentLabels[status]}
    </span>
  )
}
