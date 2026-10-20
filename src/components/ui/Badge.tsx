'use client'

import { cn } from '@/lib/utils'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { useTranslations } from 'next-intl'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border border-slate-200',
  AWAITING_CONSOLIDATION: 'bg-amber-50 text-amber-800 border border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-800 border border-blue-200',
  PROCESSING: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-800 border border-purple-200',
  DELIVERED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  COMPLETED: 'bg-teal-50 text-teal-800 border border-teal-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
}

const paymentStyles: Record<PaymentStatus, string> = {
  UNPAID: 'bg-red-50 text-red-700 border border-red-200',
  PARTIAL: 'bg-amber-50 text-amber-800 border border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
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
  const t = useTranslations('status')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status] || 'bg-gray-100 text-gray-700 border border-gray-200',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t.has(status) ? t(status) : status}
    </span>
  )
}

export function PaymentBadge({ status, className }: PaymentBadgeProps) {
  const t = useTranslations('payment')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        paymentStyles[status] || 'bg-gray-100 text-gray-700 border border-gray-200',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t.has(status) ? t(status) : status}
    </span>
  )
}

