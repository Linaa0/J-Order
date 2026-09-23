'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, RotateCcw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { StatusTracker } from '@/components/orders/StatusTracker'
import { OrderCardSkeleton } from '@/components/ui/Skeleton'
import { getProductIcon } from '@/components/icons/ProductIcons'
import { PRODUCT_LABELS } from '@/lib/order-utils'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'
import { toast } from 'sonner'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-3 pt-4"><OrderCardSkeleton /><OrderCardSkeleton /></div>
  if (!order) return <div className="text-center py-16 text-navy-400">Order not found</div>

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-navy-50 text-navy-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-900">Order Details</h1>
          <p className="text-xs text-navy-400 font-mono">{order.orderNumber}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={order.status} />
        </div>
      </div>

      <Card>
        <h2 className="font-display font-semibold text-navy-800 mb-4">Order Progress</h2>
        <StatusTracker status={order.status} />
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-navy-800 mb-3">Items Ordered</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700">
                {getProductIcon(item.product, { size: 24 })}
              </div>
              <div className="flex-1">
                <p className="font-medium text-navy-900">{PRODUCT_LABELS[item.product]}</p>
                <p className="text-sm text-navy-400">Quantity: {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-navy-800 mb-3">Delivery Details</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="text-ember-700 shrink-0 mt-0.5" />
            <span className="text-navy-700">{order.deliveryAddress}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-ember-700 shrink-0" />
            <span className="text-navy-700">{formatDate(order.preferredDate)} at {order.preferredTime}</span>
          </div>
          {order.notes && (
            <div className="mt-2 p-3 bg-navy-50 rounded-xl text-sm text-navy-600">
              {order.notes}
            </div>
          )}
        </div>
      </Card>

      {order.statusHistory.length > 0 && (
        <Card>
          <h2 className="font-display font-semibold text-navy-800 mb-3">Activity Log</h2>
          <div className="space-y-3">
            {order.statusHistory.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-ember-600 mt-2 shrink-0" />
                <div>
                  <p className="text-navy-800 font-medium">{h.newStatus.replace(/_/g, ' ')}</p>
                  {h.reason && <p className="text-navy-500 text-xs">{h.reason}</p>}
                  <p className="text-navy-400 text-xs">{formatDateTime(h.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-3 pb-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            router.push(`/order/new?reorder=${order.id}`)
          }}
        >
          <RotateCcw size={16} />
          Reorder
        </Button>
        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => setShowCancelModal(true)}
          >
            <AlertTriangle size={16} />
            Cancel Order
          </Button>
        )}
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <h3 className="font-display text-lg font-bold text-navy-900 mb-2">Cancel Order</h3>
            <p className="text-sm text-navy-500 mb-4">Please tell us why you want to cancel this order.</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="w-full rounded-xl border-2 border-navy-200 p-3 text-navy-900 text-sm focus:outline-none focus:border-ember-700 resize-none mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>
                Keep Order
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={cancelling}
                disabled={!cancelReason.trim()}
                onClick={async () => {
                  setCancelling(true)
                  try {
                    const res = await fetch(`/api/orders/${order.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'CANCELLED', reason: cancelReason }),
                    })
                    if (res.ok) {
                      toast.success('Order cancelled')
                      router.push('/orders')
                    }
                  } finally {
                    setCancelling(false)
                    setShowCancelModal(false)
                  }
                }}
              >
                Yes, Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
