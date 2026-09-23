'use client'
import { motion } from 'framer-motion'
import { Check, Clock, Truck, Package, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrderStatus } from '@prisma/client'
import { ORDER_STATUS_STEPS, getStatusStep } from '@/lib/order-utils'

const stepIcons = [Clock, Check, Package, Truck, CheckCircle2]
const stepLabels = ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered']

interface StatusTrackerProps {
  status: OrderStatus
  className?: string
}

export function StatusTracker({ status, className }: StatusTrackerProps) {
  const isCancelled = status === OrderStatus.CANCELLED
  const currentStep = getStatusStep(status)

  if (isCancelled) {
    return (
      <div className={cn('flex items-center gap-3 p-4 bg-red-50 rounded-2xl', className)}>
        <XCircle className="text-red-600 shrink-0" size={32} />
        <div>
          <p className="font-semibold text-red-800">Order Cancelled</p>
          <p className="text-sm text-red-600">This order has been cancelled</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('py-2', className)}>
      <div className="relative">
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-navy-100" />
        <motion.div
          className="absolute left-6 top-6 w-0.5 bg-ember-gradient origin-top"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: currentStep / (ORDER_STATUS_STEPS.length - 1) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: 'calc(100% - 3rem)' }}
        />
        <div className="space-y-4">
          {ORDER_STATUS_STEPS.map((step, idx) => {
            const Icon = stepIcons[idx]
            const isComplete = idx < currentStep
            const isCurrent = idx === currentStep
            const isPending = idx > currentStep

            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="relative flex items-center gap-4 pl-2"
              >
                <motion.div
                  className={cn(
                    'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    isComplete && 'bg-ember-gradient border-transparent text-white',
                    isCurrent && 'border-ember-700 bg-white text-ember-700 shadow-ember',
                    isPending && 'border-navy-200 bg-white text-navy-300'
                  )}
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Icon size={18} strokeWidth={2} />
                  {isCurrent && (
                    <motion.span
                      className="absolute -inset-1 rounded-full border-2 border-ember-700/30"
                      animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                <div>
                  <p className={cn(
                    'font-semibold text-sm',
                    isComplete && 'text-navy-900',
                    isCurrent && 'text-ember-800',
                    isPending && 'text-navy-300'
                  )}>
                    {stepLabels[idx]}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-ember-600 mt-0.5">In progress</p>
                  )}
                  {isComplete && (
                    <p className="text-xs text-navy-400 mt-0.5">Complete</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
