'use client'
import { useCallback, useEffect, useState, useRef } from 'react'
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
import { formatDate, cn } from '@/lib/utils'
import { calculateOrderWeight, suggestTruckCapacity, TRUCK_CAPACITY_KG } from '@/lib/order-operations'
import type { OrderWithDetails } from '@/types'
import { OrderStatus } from '@prisma/client'
import { toast } from 'sonner'
import { useLivePolling } from '@/hooks/useLivePolling'

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
  const tStatus = useTranslations('status')
  const tp = useTranslations('products')
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

  const knownOrderIdsRef = useRef<Set<string> | null>(null)
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set())

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (productFilter) params.set('product', productFilter)
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      const incoming: OrderWithDetails[] = data.data ?? []

      if (knownOrderIdsRef.current !== null) {
        const fresh = incoming.filter((o) => !knownOrderIdsRef.current?.has(o.id))
        if (fresh.length > 0) {
          fresh.forEach((o) => {
            toast.info(`New order ${o.orderNumber}`)
          })
          const freshIds = new Set(fresh.map((o) => o.id))
          setNewlyAddedIds(freshIds)
          setTimeout(() => {
            setNewlyAddedIds(new Set())
          }, 4000)
        }
      }
      knownOrderIdsRef.current = new Set(incoming.map((o) => o.id))
      setOrders(incoming)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, productFilter])

  const { secondsAgo, refresh, isRefreshing } = useLivePolling(fetchOrders, {
    intervalMs: 10000,
  })

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
          <h1 className="font-body text-2xl font-bold text-navy-900">{t('dashboard')}</h1>
          <p className="text-sm text-gray-500">
            {pendingCount > 0
              ? <span className="text-navy-900 font-medium">{t('ordersWaiting', { count: pendingCount })}</span>
              : t('allCaughtUp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live</span>
            <span className="text-emerald-400">·</span>
            <span className="text-gray-500">Updated {secondsAgo}s ago</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            aria-label={tCommon('refresh')}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t('filterByStatus')}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900 bg-white shrink-0"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{tStatus.has(s) ? tStatus(s) : ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          aria-label={t('filterByProduct')}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900 bg-white shrink-0"
        >
          <option value="">{t('allProducts')}</option>
          {PRODUCT_OPTIONS.map((p) => (
            <option key={p} value={p}>{tp.has(p) ? tp(p) : PRODUCT_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle size={40} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
          <p className="font-medium">{t('noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={cn(
                  'cursor-pointer hover:border-gray-400 transition-colors',
                  newlyAddedIds.has(order.id) && 'ring-2 ring-orange-500 bg-orange-50/50'
                )}
                onClick={() => { setSelectedOrder(order); setNewStatus('') }}
                role="button"
                aria-label={`Order ${order.orderNumber}`}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedOrder(order); setNewStatus('') } }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-navy-900 shrink-0">
                      {order.items[0] && getProductIcon(order.items[0].product, { size: 22 })}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900 truncate text-sm">{order.client.name ?? order.client.phone}</p>
                      <p className="text-xs text-gray-500 font-mono">{order.orderNumber}</p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate max-w-[220px]">{order.deliveryAddress}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.preferredDate)} · {order.preferredTime}</p>
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {order.items.map((item) => (
                    <span key={item.id} className="text-xs bg-gray-100 text-navy-900 rounded-md px-2 py-0.5">
                      {item.quantity}x {tp.has(item.product) ? tp(item.product as Parameters<typeof tp>[0]) : PRODUCT_LABELS[item.product]}
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
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-status-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm"
            >
              <h3 id="update-status-title" className="font-body text-lg font-bold text-navy-900 mb-1">
                {t('updateStatus')}
              </h3>
              <p className="text-xs font-mono text-gray-500 mb-4">{selectedOrder.orderNumber}</p>

              <div className="space-y-2 mb-4">
                {(['CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as OrderStatus[])
                  .filter((s) => canTransitionTo(selectedOrder.status, s))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors min-h-[44px] ${
                        newStatus === s
                          ? 'border-navy-900 bg-navy-50 text-navy-900'
                          : 'border-gray-200 text-navy-900 hover:border-gray-300'
                      }`}
                    >
                      {tStatus.has(s) ? tStatus(s) : ORDER_STATUS_LABELS[s]}
                    </button>
                  ))}
              </div>

              {newStatus === 'CANCELLED' && (
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('cancelReasonRequired')}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-navy-900 focus:outline-none focus:border-navy-900 resize-none mb-3"
                  rows={2}
                  aria-label={t('cancelReasonRequired')}
                />
              )}

              {newStatus === 'OUT_FOR_DELIVERY' && (
                <div className="mb-3 space-y-1">
                  <p className="text-sm text-navy-900">
                    {t('estimatedLoad', { kg: calculateOrderWeight(selectedOrder.items) })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {suggestTruckCapacity(calculateOrderWeight(selectedOrder.items))
                      ? t('suggestedTruck', { truck: suggestTruckCapacity(calculateOrderWeight(selectedOrder.items))!.replace(/_/g, ' ') })
                      : t('aboveCapacity')}
                  </p>
                  <select
                    value={truckCapacity || selectedOrder.truckCapacity || suggestTruckCapacity(calculateOrderWeight(selectedOrder.items)) || ''}
                    onChange={(e) => setTruckCapacity(e.target.value)}
                    aria-label={t('chooseTruck')}
                    className="mt-2 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:border-navy-900"
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
                  variant="primary"
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
