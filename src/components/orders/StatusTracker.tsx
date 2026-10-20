'use client'
import { motion } from 'framer-motion'
import { Check, Clock, Truck, Package, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { OrderStatus } from '@prisma/client'
import { ORDER_STATUS_STEPS, getStatusStep } from '@/lib/order-utils'

const stepIcons = [Clock, Check, Package, Truck, CheckCircle2]

interface StatusTrackerProps {
  status: OrderStatus
  className?: string
}

export function StatusTracker({ status, className }: StatusTrackerProps) {
  const t = useTranslations('tracking')
  const tStatus = useTranslations('status')
  const isCancelled = status === OrderStatus.CANCELLED
  const currentStep = getStatusStep(status)

  if (isCancelled) {
    return (
      <div className={cn('flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl', className)}>
        <XCircle className="text-red-600 shrink-0" size={28} />
        <div>
          <p className="font-semibold text-red-800 text-sm">{tStatus('CANCELLED')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('py-2', className)}>
      <div className="relative">
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
        <motion.div
          className="absolute left-5 top-5 w-0.5 bg-orange-600 origin-top"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: ORDER_STATUS_STEPS.length > 1 ? currentStep / (ORDER_STATUS_STEPS.length - 1) : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: 'calc(100% - 2.5rem)' }}
        />
        <div className="space-y-4">
          {ORDER_STATUS_STEPS.map((step, idx) => {
            const Icon = stepIcons[idx]
            const isComplete = idx < currentStep
            const isCurrent = idx === currentStep
            const isPending = idx > currentStep
            return (
              <div
                key={step}
                className="relative flex items-center gap-4 pl-1"
              >
                <div
                  className={cn(
                    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-all',
                    isComplete && 'bg-navy-900 border-navy-900 text-white',
                    isCurrent && 'border-orange-600 bg-white text-orange-600 font-bold',
                    isPending && 'border-gray-300 bg-white text-gray-400'
                  )}
                >
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div>
                  <p className={cn('font-medium text-sm', isComplete && 'text-navy-900', isCurrent && 'text-orange-600 font-semibold', isPending && 'text-gray-400')}>
                    {t(step)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
