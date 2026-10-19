'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { OrderCardSkeleton } from '@/components/ui/Skeleton'
import { getProductIcon } from '@/components/icons/ProductIcons'
import { PRODUCT_LABELS, ORDER_STATUS_LABELS, canTransitionTo } from '@/lib/order-utils'
import { formatDate } from '@/lib/utils'
import { calculateOrderWeight, suggestTruckCapacity, TRUCK_CAPACITY_KG } from '@/lib/order-operations'
import type { OrderWithDetails } from '@/types'
import { OrderStatus } from '@prisma/client'
import { toast } from 'sonner'

const STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.AWAITING_CONSOLIDATION,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
]
const PRODUCT_OPTIONS = ['GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG'] as const

export default function StaffDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('staff')
  const tCommon = useTranslations('common')

  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [truckCapacity, setTruckCapacity] = useState('')

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
    if (status === 'loading') return
    if (
      session?.user?.role !== 'ORDER_STAFF' &&
      session?.user?.role !== 'TECHNICIAN' &&
      session?.user?.role !== 'ADMIN'
    ) {
      router.replace('/')
      return
    }
    void fetchOrders()
    const interval = setInterval(() => void fetchOrders(), 30_000)
    return () => clearInterval(interval)
  }, [status, session, fetchOrders, router])

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
          truckCapacity: newStatus === 'OUT_FOR_DELIVERY' ? (truckCapacity || undefined) : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? t('updateError'))
        return
      }
      toast.success(t('updateSuccess'))
      setSelectedOrder(null)
      setNewStatus('')
      setCancelReason('')
      setTruckCapacity('')
      void fetchOrders()
    } finally {
      setUpdating(false)
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">{t('dashboard')}</h1>
          <p className="text-sm text-navy-400">
            {pendingCount > 0
              ? <span className="text-navy-700 font-medium">{t('ordersWaiting', { count: pendingCount })}</span>
              : t('allCaughtUp')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void fetchOrders()} aria-label={tCommon('refresh')}>
          <RefreshCw size={18} aria-hidden="true" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t('filterByStatus')}
          className="h-9 rounded-xl border-2 border-navy-200 px-3 text-sm text-navy-800 focus:outline-none focus:border-navy-800 bg-white shrink-0"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          aria-label={t('filterByProduct')}
          className="h-9 rounded-xl border-2 border-navy-200 px-3 text-sm text-navy-800 focus:outline-none focus:border-navy-800 bg-white shrink-0"
        >
          <option value="">{t('allProducts')}</option>
          {PRODUCT_OPTIONS.map((p) => (
            <option key={p} value={p}>{PRODUCT_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-navy-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-navy-300" aria-hidden="true" />
          <p className="font-medium">{t('noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="cursor-pointer hover:shadow-navy transition-shadow"
                onClick={() => { setSelectedOrder(order); setNewStatus('') }}
                role="button"
                aria-label={`Order ${order.orderNumber}`}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedOrder(order); setNewStatus('') } }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700 shrink-0">
                      {order.items[0] && getProductIcon(order.items[0].product, { size: 22 })}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900 truncate">{order.client.name ?? order.client.phone}</p>
                      <p className="text-xs text-navy-400 font-mono">{order.orderNumber}</p>
                      <p className="text-xs text-navy-500 mt-0.5 truncate max-w-[220px]">{order.deliveryAddress}</p>
                      <p className="text-xs text-navy-400">{formatDate(order.preferredDate)} · {order.preferredTime}</p>
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

      {/* Status update modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-status-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 id="update-status-title" className="font-display text-lg font-bold text-navy-900 mb-1">
                {t('updateStatus')}
              </h3>
              <p className="text-xs font-mono text-navy-400 mb-4">{selectedOrder.orderNumber}</p>

              <div className="space-y-2 mb-4">
                {(['CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as OrderStatus[])
                  .filter((s) => canTransitionTo(selectedOrder.status, s))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px] ${
                        newStatus === s
                          ? 'border-navy-800 bg-navy-50 text-navy-900'
                          : 'border-navy-200 text-navy-700 hover:border-navy-400'
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
                  placeholder={t('cancelReasonRequired')}
                  className="w-full rounded-xl border-2 border-navy-200 p-3 text-sm text-navy-900 focus:outline-none focus:border-navy-800 resize-none mb-3"
                  rows={2}
                  aria-label={t('cancelReasonRequired')}
                />
              )}

              {newStatus === 'OUT_FOR_DELIVERY' && (
                <div className="mb-3 space-y-1">
                  <p className="text-sm text-navy-700">
                    {t('estimatedLoad', { kg: calculateOrderWeight(selectedOrder.items) })}
                  </p>
                  <p className="text-xs text-navy-500">
                    {suggestTruckCapacity(calculateOrderWeight(selectedOrder.items))
                      ? t('suggestedTruck', { truck: suggestTruckCapacity(calculateOrderWeight(selectedOrder.items))!.replace(/_/g, ' ') })
                      : t('aboveCapacity')}
                  </p>
                  <select
                    value={truckCapacity || selectedOrder.truckCapacity || suggestTruckCapacity(calculateOrderWeight(selectedOrder.items)) || ''}
                    onChange={(e) => setTruckCapacity(e.target.value)}
                    aria-label={t('chooseTruck')}
                    className="mt-2 h-10 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm focus:outline-none focus:border-navy-800"
                  >
                    <option value="">{t('chooseTruck')}</option>
                    {(Object.entries(TRUCK_CAPACITY_KG) as [string, number][]).map(([cap, kg]) => (
                      <option key={cap} value={cap}>{cap.replace(/_/g, ' ')} · {kg} kg</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setSelectedOrder(null); setNewStatus(''); setCancelReason('') }}
                >
                  {tCommon('close')}
                </Button>
                <Button
                  className="flex-1"
                  loading={updating}
                  disabled={
                    !newStatus ||
                    (newStatus === 'CANCELLED' && !cancelReason.trim()) ||
                    (newStatus === 'OUT_FOR_DELIVERY' && !(truckCapacity || selectedOrder.truckCapacity || suggestTruckCapacity(calculateOrderWeight(selectedOrder.items))))
                  }
                  onClick={updateOrderStatus}
                >
                  {tCommon('confirm')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
