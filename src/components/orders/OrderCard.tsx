'use client'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Package } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/Badge'
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
  const primaryItem = order.items[0]
  const label = primaryItem ? PRODUCT_LABELS[primaryItem.product] : 'Order'
  const extraCount = order.items.length - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link href={`/orders/${order.id}`} onClick={onClick}>
        <Card className="hover:shadow-navy transition-shadow cursor-pointer group">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700 group-hover:text-ember-700 transition-colors">
              {primaryItem && getProductIcon(primaryItem.product, { size: 28 })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="font-semibold text-navy-900 truncate">
                    {label}
                    {extraCount > 0 && (
                      <span className="text-navy-400 font-normal"> +{extraCount} more</span>
                    )}
                  </p>
                  <p className="text-xs text-navy-400 font-mono">{order.orderNumber}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              {!compact && (
                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-navy-500">
                    <MapPin size={12} />
                    <span className="truncate">{order.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-navy-500">
                    <Calendar size={12} />
                    <span>{formatDate(order.preferredDate)} at {order.preferredTime}</span>
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
