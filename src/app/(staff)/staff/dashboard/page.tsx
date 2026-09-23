'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Filter, CheckCircle, Clock, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { OrderCardSkeleton } from '@/components/ui/Skeleton'
import { getProductIcon } from '@/components/icons/ProductIcons'
import { PRODUCT_LABELS, ORDER_STATUS_LABELS, canTransitionTo } from '@/lib/order-utils'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'
import { OrderStatus } from '@prisma/client'
import { toast } from 'sonner'

const STATUS_OPTIONS = ['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED']
const PRODUCT_OPTIONS = ['', 'GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG']

export default function StaffDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (productFilter) params.set('product', productFilter)
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      setOrders(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, productFilter])

  useEffect(() => {
    if (session?.user?.role !== 'ORDER_STAFF' && session?.user?.role !== 'TECHNICIAN' && session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [session, fetchOrders])

  async function updateOrderStatus() {
    if (!selectedOrder || !newStatus) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: newStatus === 'CANCELLED' ? cancelReason : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to update status')
        return
      }
      toast.success('Order status updated')
      setSelectedOrder(null)
      setNewStatus('')
      setCancelReason('')
      fetchOrders()
    } finally {
      setUpdating(false)
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Staff Dashboard</h1>
          <p className="text-sm text-navy-400">
            {pendingCount > 0 ? (
              <span className="text-amber-700 font-medium">{pendingCount} orders waiting</span>
            ) : (
              'All caught up'
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchOrders} aria-label="Refresh">
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-xl border-2 border-navy-200 px-3 text-sm text-navy-800 focus:outline-none focus:border-ember-700 bg-white shrink-0"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s as OrderStatus]}</option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-9 rounded-xl border-2 border-navy-200 px-3 text-sm text-navy-800 focus:outline-none focus:border-ember-700 bg-white shrink-0"
        >
          <option value="">All Products</option>
          {PRODUCT_OPTIONS.filter(Boolean).map((p) => (
            <option key={p} value={p}>{PRODUCT_LABELS[p as keyof typeof PRODUCT_LABELS]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-navy-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <p className="font-medium">No orders at this time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="cursor-pointer hover:shadow-navy transition-shadow" onClick={() => { setSelectedOrder(order); setNewStatus('') }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700 shrink-0">
                      {order.items[0] && getProductIcon(order.items[0].product, { size: 24 })}
                    </div>
                    <div>
                      <p className="font-semibold text-navy-900">{order.client.name ?? order.client.phone}</p>
                      <p className="text-xs text-navy-400 font-mono">{order.orderNumber}</p>
                      <p className="text-xs text-navy-500 mt-1 truncate max-w-[200px]">{order.deliveryAddress}</p>
                      <p className="text-xs text-navy-400">{formatDate(order.preferredDate)} at {order.preferredTime}</p>
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {order.items.map((item) => (
                    <span key={item.id} className="text-xs bg-navy-50 text-navy-600 rounded-lg px-2 py-0.5">
                      {item.quantity}x {PRODUCT_LABELS[item.product]}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 className="font-display text-lg font-bold text-navy-900 mb-1">Update Order Status</h3>
              <p className="text-xs font-mono text-navy-400 mb-4">{selectedOrder.orderNumber}</p>

              <div className="space-y-2 mb-4">
                {(['CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as OrderStatus[])
                  .filter((s) => canTransitionTo(selectedOrder.status, s))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        newStatus === s
                          ? 'border-ember-700 bg-ember-50 text-ember-800'
                          : 'border-navy-200 text-navy-700 hover:border-navy-300'
                      }`}
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </button>
                  ))}
              </div>

              {newStatus === 'CANCELLED' && (
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation (required)"
                  className="w-full rounded-xl border-2 border-navy-200 p-3 text-sm text-navy-900 focus:outline-none focus:border-ember-700 resize-none mb-3"
                  rows={2}
                />
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setSelectedOrder(null); setNewStatus(''); setCancelReason('') }}>
                  Close
                </Button>
                <Button
                  className="flex-1"
                  loading={updating}
                  disabled={!newStatus || (newStatus === 'CANCELLED' && !cancelReason.trim())}
                  onClick={updateOrderStatus}
                >
                  Update
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
