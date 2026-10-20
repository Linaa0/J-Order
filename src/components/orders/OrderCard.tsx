'use client'
import { motion } from 'framer-motion'
import { Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { StatusBadge, PaymentBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDate, formatDateTime } from '@/lib/utils'
import { PRODUCT_LABELS } from '@/lib/order-utils'
import { getProductIcon } from '@/components/icons/ProductIcons'
import type { OrderWithDetails } from '@/types'

interface OrderCardProps {
  order: OrderWithDetails
  compact?: boolean
  onClick?: () => void
}

export function OrderCard({ order, compact, onClick }: OrderCardProps) {
  const t = useTranslations('order')
  const tp = useTranslations('products')
  const ta = useTranslations('admin')
  const primaryItem = order.items[0]
  const label = primaryItem && tp.has(primaryItem.product) ? tp(primaryItem.product as Parameters<typeof tp>[0]) : (primaryItem ? PRODUCT_LABELS[primaryItem.product] : 'Order')
  const extraCount = order.items.length - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/orders/${order.id}`} onClick={onClick}>
        <Card className="hover:border-gray-400 transition-colors cursor-pointer group">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-navy-900 group-hover:text-orange-600 transition-colors">
              {primaryItem && getProductIcon(primaryItem.product, { size: 28 })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 truncate text-sm sm:text-base">
                    {label}
                    {extraCount > 0 && (
                      <span className="text-navy-400 font-normal"> +{extraCount}</span>
                    )}
                  </p>
                  <p className="text-xs text-navy-400 font-mono">{order.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-navy-500">{t('purchaseCode')} {order.purchaseCode}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              {!compact && (
                <div className="space-y-1.5 mt-2">
                  <div className="flex flex-wrap gap-2">
                    <PaymentBadge status={order.paymentStatus} />
                    {order.group && (
                      <span className="inline-flex rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-700">
                        {order.group.type === 'CUSTOMER_GROUP' ? ta('customerGroup') : ta('deliveryConsolidation')} · {order.group.reference}
                      </span>
                    )}
                    {order.tinNumber && (
                      <span className="text-xs text-navy-500 self-center">TIN {order.tinNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-navy-500">
                    <MapPin size={12} aria-hidden="true" />
                    <span className="truncate">{order.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-navy-500">
                    <Calendar size={12} aria-hidden="true" />
                    <span>{formatDate(order.preferredDate)}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-navy-300 mt-2">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
