'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  RefreshCw,
  Truck,
  Download,
  CreditCard,
  MoreVertical,
  Eye,
  Edit,
  Search,
  Package,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PRODUCT_LABELS, ORDER_STATUS_LABELS } from '@/lib/order-utils'
import { TRUCK_CAPACITY_KG, calculateOrderWeight, suggestTruckCapacity } from '@/lib/order-operations'
import { OrderStatusPill, PaymentStatusPill } from '@/components/admin/DashboardOverview'
import { OrderDrawer } from '@/components/admin/OrderDrawer'
import { toast } from 'sonner'
import { useLivePolling } from '@/hooks/useLivePolling'

export type OrderRow = {
  id: string
  orderNumber: string
  purchaseCode: string
  status: keyof typeof ORDER_STATUS_LABELS
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL'
  tinNumber: string | null
  deliveryAddress: string
  createdAt: string
  items: Array<{ id: string; product: keyof typeof PRODUCT_LABELS; quantity: number }>
  client: { name: string | null; phone: string }
  group: { id: string; reference: string; type: 'CUSTOMER_GROUP' | 'CONSOLIDATION'; truckCapacity: string | null } | null
}

type Summary = {
  summaryDate: string
  totalOrders: number
  statusCounts: Record<string, number>
  productTotals: Record<string, number>
  paidOrders: number
  unpaidOrders: number
}

const capacityLabels: Record<string, string> = {
  TWO_TONNES: '2 tonnes',
  THREE_AND_HALF_TONNES: '3.5 tonnes',
  FOUR_AND_HALF_TONNES: '4.5 tonnes',
}

function SummaryWidget() {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [history, setHistory] = useState<Array<{ summaryDate: string; payload: Summary }>>([])
  const [selectedDate, setSelectedDate] = useState('')

  const load = useCallback(async (date?: string) => {
    const response = await fetch(`/api/admin/summaries${date ? `?date=${date}` : ''}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || tCommon('generic'))
    setSummary(data.data.current)
    setHistory(data.data.history)
  }, [tCommon])

  useEffect(() => {
    void load().catch(() => toast.error(tCommon('generic')))
  }, [load, tCommon])

  return (
    <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase font-semibold text-gray-500">{t('dailySummary')}</p>
          <h2 className="text-xl font-bold text-navy-900">{t('ordersToday2', { count: summary?.totalOrders ?? 0 })}</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Previous summary date"
            value={selectedDate}
            onChange={(event) => {
              const date = event.target.value
              setSelectedDate(date)
              void load(date || undefined)
            }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-navy-900 focus:outline-none focus:border-navy-500 font-medium"
          >
            <option value="">{tCommon('today')}</option>
            {history.map((item) => (
              <option key={item.summaryDate} value={new Date(item.summaryDate).toISOString().slice(0, 10)}>
                {new Date(item.summaryDate).toLocaleDateString()}
              </option>
            ))}
          </select>
          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={tCommon('refresh')} onClick={() => void load(selectedDate || undefined)}>
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>
      {summary && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs border-t border-gray-100 pt-3">
          <div>
            <p className="text-gray-500">{t('paidUnpaid', { paid: summary.paidOrders, unpaid: summary.unpaidOrders })}</p>
          </div>
          <div>
            <p className="text-gray-500">{t('byStatus')}</p>
            <p className="font-semibold text-navy-900 mt-0.5">
              {Object.entries(summary.statusCounts).filter(([, count]) => count).map(([st, count]) => `${st.replace(/_/g, ' ')}: ${count}`).join(', ') || tCommon('noResults')}
            </p>
          </div>
          <div>
            <p className="text-gray-500">{t('productQuantities')}</p>
            <p className="font-semibold text-navy-900 mt-0.5">
              {Object.entries(summary.productTotals).filter(([, count]) => count).map(([product, count]) => `${PRODUCT_LABELS[product as keyof typeof PRODUCT_LABELS] ?? product} ${count}`).join(', ') || tCommon('noResults')}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

export function AdminOrdersPanel() {
  const t = useTranslations('admin')
  const tPayment = useTranslations('payment')
  const tCommon = useTranslations('common')
  const tProducts = useTranslations('products')
  const locale = useLocale()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [limit, setLimit] = useState(25)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  // Drawer state
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerAction, setDrawerAction] = useState<'view' | 'payment' | 'status'>('view')

  // Actions menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (status) params.set('status', status)
      if (payment) params.set('paymentStatus', payment)
      if (search) params.set('search', search)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const response = await fetch(`/api/admin/orders?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || tCommon('generic'))
      setOrders(data.data)
      setPages(Math.max(1, data.pagination.pages))
      setTotalCount(data.pagination.total)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon('generic'))
    } finally {
      setLoading(false)
    }
  }, [page, limit, status, payment, search, from, to, tCommon])

  const { secondsAgo, refresh, isRefreshing } = useLivePolling(load, {
    intervalMs: 10000,
  })

  useEffect(() => {
    void load()
  }, [load])

  function handleExportCsv() {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (payment) params.set('paymentStatus', payment)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    window.location.href = `/api/admin/orders/export?${params.toString()}`
  }

  function handleOpenDrawer(id: string, action: 'view' | 'payment' | 'status' = 'view') {
    setDrawerOrderId(id)
    setDrawerAction(action)
    setDrawerOpen(true)
    setOpenMenuId(null)
  }

  const formatLocaleDate = useCallback(
    (dateString?: string | Date) => {
      if (!dateString) return '—'
      try {
        const d = typeof dateString === 'string' ? new Date(dateString) : dateString
        const loc = locale === 'rw' ? 'rw-RW' : locale === 'fr' ? 'fr-FR' : locale === 'sw' ? 'sw-KE' : 'en-US'
        return new Intl.DateTimeFormat(loc, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(d)
      } catch {
        return String(dateString)
      }
    },
    [locale]
  )

  const formatItemsSummary = useCallback(
    (items: OrderRow['items']) => {
      if (!items || items.length === 0) return '—'
      return items
        .map((item) => {
          const name = tProducts.has(item.product) ? tProducts(item.product) : item.product.replace(/_/g, ' ')
          return `${item.quantity} × ${name}`
        })
        .join(', ')
    },
    [tProducts]
  )

  const statusOptions = Object.keys(ORDER_STATUS_LABELS)

  return (
    <div className="space-y-6">
      {/* 1. Daily Summary Widget */}
      <SummaryWidget />

      {/* 2. Filter & Actions Toolbar Card */}
      <Card className="p-4 sm:p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-navy-900 text-base">{t('orders')}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {totalCount}
            </span>
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
              className="h-8 w-8 text-gray-500 hover:text-navy-900"
              aria-label={tCommon('refresh')}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 border-gray-200 text-navy-900 hover:bg-gray-50"
            >
              <Download size={14} className="mr-1.5" />
              {t('exportCsv')}
            </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              aria-label={t('search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('search')}
              className="h-10 w-full pl-9 pr-3 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:border-navy-500"
            />
          </div>

          <select
            aria-label={t('filterStatus')}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="h-10 text-xs px-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-navy-500 font-medium text-navy-900"
          >
            <option value="">{t('filterStatus')}</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <select
            aria-label={t('filterPayment')}
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value)
              setPage(1)
            }}
            className="h-10 text-xs px-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-navy-500 font-medium text-navy-900"
          >
            <option value="">{t('filterPayment')}</option>
            <option value="PAID">{tPayment('PAID')}</option>
            <option value="PARTIAL">{tPayment('PARTIAL')}</option>
            <option value="UNPAID">{tPayment('UNPAID')}</option>
          </select>

          <input
            aria-label={t('fromDate')}
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            className="h-10 text-xs px-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-navy-500"
          />

          <input
            aria-label={t('toDate')}
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
            className="h-10 text-xs px-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-navy-500"
          />
        </div>
      </Card>

      {/* 3. Orders Table (>= 768px: Clean table with NO horizontal scroll at >=1024px) */}
      <Card className="p-0 border border-gray-200/80 rounded-xl bg-white shadow-xs overflow-hidden">
        <div className="hidden md:block lg:overflow-visible overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 uppercase text-[11px] font-semibold border-b border-gray-100">
                <th className="py-3 px-4 w-[24%]">{t('column_order')}</th>
                <th className="py-3 px-4 w-[28%]">{t('column_items')}</th>
                <th className="py-3 px-4 w-[14%]">{t('column_payment')}</th>
                <th className="py-3 px-4 w-[16%]">{t('column_status')}</th>
                <th className="py-3 px-4 w-[12%]">{t('orderedAt')}</th>
                <th className="py-3 px-3 w-[6%] text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-navy-900">{t('noOrders')}</p>
                    <p className="text-xs text-gray-500 mt-1">{tCommon('noResults')}</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleOpenDrawer(order.id, 'view')}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Column 1: Order number and customer underneath in full cell */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-navy-900 font-mono text-sm leading-tight break-all">
                        {order.orderNumber}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 leading-tight break-words">
                        {order.client?.name || order.client?.phone || t('unnamed')}
                      </div>
                    </td>

                    {/* Column 2: Items (wrapping) */}
                    <td className="py-3.5 px-4 text-gray-700 leading-normal break-words">
                      {formatItemsSummary(order.items)}
                    </td>

                    {/* Column 3: Payment status pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PaymentStatusPill status={order.paymentStatus} />
                    </td>

                    {/* Column 4: Order status pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <OrderStatusPill status={order.status} />
                    </td>

                    {/* Column 5: Date */}
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap text-xs">
                      {formatLocaleDate(order.createdAt)}
                    </td>

                    {/* Column 6: Three-dot actions menu */}
                    <td
                      className="py-3.5 px-3 text-right whitespace-nowrap relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-navy-900 hover:bg-gray-100 transition"
                        aria-label={t('actions')}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === order.id && (
                        <div
                          ref={actionsMenuRef}
                          className="absolute right-3 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-40 text-left"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(order.id, 'view')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-navy-900"
                          >
                            <Eye size={14} className="text-gray-400" />
                            <span>{tCommon('view')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(order.id, 'payment')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-navy-900"
                          >
                            <CreditCard size={14} className="text-gray-400" />
                            <span>{t('recordPayment')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(order.id, 'status')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-navy-900"
                          >
                            <Edit size={14} className="text-gray-400" />
                            <span>{t('updateStatus')}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Mobile (< 768px): Card View */}
        <div className="md:hidden divide-y divide-gray-100 p-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">{t('noOrders')}</div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-navy-900 text-sm">
                    {order.orderNumber}
                  </span>
                  <OrderStatusPill status={order.status} />
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-medium text-navy-900">
                    {order.client?.name || order.client?.phone || t('unnamed')}
                  </p>
                  <p className="text-gray-600 line-clamp-2">
                    {formatItemsSummary(order.items)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                  <PaymentStatusPill status={order.paymentStatus} />
                  <span className="text-gray-500 text-[11px]">{formatLocaleDate(order.createdAt)}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => handleOpenDrawer(order.id, 'view')}
                  >
                    <Eye size={13} className="mr-1" />
                    {tCommon('view')}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    onClick={() => handleOpenDrawer(order.id, 'payment')}
                  >
                    <CreditCard size={13} className="mr-1" />
                    {t('recordPayment')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 5. Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 bg-gray-50/50 text-xs">
          <span className="text-gray-500 font-medium">
            {t('pageOf', { page, pages })} · {totalCount} {t('orders')}
          </span>

          <div className="flex items-center gap-3">
            {/* Rows per page selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 hidden sm:inline">{t('rowsPerPage')}:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="h-8 text-xs border border-gray-200 rounded-lg bg-white px-2 focus:outline-none focus:border-navy-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5"
                disabled={page <= 1 || loading}
                onClick={() => setPage((v) => v - 1)}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2.5"
                disabled={page >= pages || loading}
                onClick={() => setPage((v) => v + 1)}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 6. Order Detail Drawer */}
      <OrderDrawer
        orderId={drawerOrderId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOrderUpdated={() => void load()}
        initialAction={drawerAction}
      />
    </div>
  )
}

export function ConsolidationPanel() {
  const t = useTranslations('admin')
  const tStaff = useTranslations('staff')
  const tCommon = useTranslations('common')
  const [clusters, setClusters] = useState<
    Array<{
      key: string
      orders: OrderRow[]
      weightKg: number
      suggestedTruck: keyof typeof TRUCK_CAPACITY_KG | null
      hasEscalated: boolean
    }>
  >([])
  const [selection, setSelection] = useState<string[]>([])
  const [capacity, setCapacity] = useState('')
  const [distance, setDistance] = useState(5)
  const [maxWait, setMaxWait] = useState(48)
  const [threshold, setThreshold] = useState(100)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/consolidation')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || tCommon('retry'))
    setClusters(data.data.clusters)
    setDistance(data.data.settings.maxConsolidationDistanceKm)
    setMaxWait(data.data.settings.maxConsolidationWaitHours)
    setThreshold(data.data.settings.consolidationSizeKg)
  }, [tCommon])

  useEffect(() => {
    void load().catch((error) => toast.error(error.message))
  }, [load])

  const selectedOrders = clusters.flatMap((cluster) => cluster.orders).filter((order) => selection.includes(order.id))
  const weightKg = selectedOrders.reduce((sum, order) => sum + calculateOrderWeight(order.items), 0)
  const suggested = suggestTruckCapacity(weightKg)
  const selectedCapacity = capacity || suggested || ''
  const maxKg = selectedCapacity ? TRUCK_CAPACITY_KG[selectedCapacity as keyof typeof TRUCK_CAPACITY_KG] : 0

  async function saveSettings() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/summaries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consolidationSizeKg: threshold,
          maxConsolidationDistanceKm: distance,
          maxConsolidationWaitHours: maxWait,
          dailySummaryHour: 18,
        }),
      })
      if (!response.ok) throw new Error(tCommon('retry'))
      toast.success(t('saveSettings'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon('retry'))
    } finally {
      setSaving(false)
    }
  }

  async function dispatch() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/consolidation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selection, truckCapacity: selectedCapacity }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || tCommon('retry'))
      toast.success(`${t('dispatchSelected')}: ${data.data.group.reference}`)
      setSelection([])
      setCapacity('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon('retry'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs">
        <h3 className="font-bold text-navy-900 text-sm mb-3">{t('deliveryConsolidation')}</h3>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="font-medium text-navy-900">
            {t('consolidationThreshold')}
            <input
              type="number"
              min="1"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="mt-1 block h-9 w-32 rounded-lg border border-gray-200 px-3 text-xs focus:border-navy-500 focus:outline-none"
            />
          </label>
          <label className="font-medium text-navy-900">
            {t('maxDistance')}
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={distance}
              onChange={(event) => setDistance(Number(event.target.value))}
              className="mt-1 block h-9 w-32 rounded-lg border border-gray-200 px-3 text-xs focus:border-navy-500 focus:outline-none"
            />
          </label>
          <label className="font-medium text-navy-900">
            {t('maxWait')}
            <input
              type="number"
              min="1"
              value={maxWait}
              onChange={(event) => setMaxWait(Number(event.target.value))}
              className="mt-1 block h-9 w-32 rounded-lg border border-gray-200 px-3 text-xs focus:border-navy-500 focus:outline-none"
            />
          </label>
          <Button
            loading={saving}
            onClick={saveSettings}
            className="h-9 px-4 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-lg"
          >
            {t('saveSettings')}
          </Button>
        </div>
      </Card>

      {clusters.length === 0 && (
        <Card className="p-8 border border-gray-200/80 rounded-xl bg-white shadow-xs text-center text-gray-500">
          <p className="text-sm">{t('noConsolidation')}</p>
        </Card>
      )}

      {clusters.map((cluster) => (
        <Card key={cluster.key} className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-navy-900 text-sm">{cluster.key}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {cluster.orders.length} {t('orders')} · {cluster.weightKg} kg {t('estimated')}
              </p>
            </div>
            {cluster.hasEscalated && (
              <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 text-xs font-semibold">
                {t('needsAttention')}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {cluster.orders.map((order) => (
              <label
                key={order.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 text-xs hover:bg-gray-50 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selection.includes(order.id)}
                  onChange={(event) =>
                    setSelection((current) =>
                      event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id)
                    )
                  }
                  className="mt-0.5 rounded text-navy-900 focus:ring-navy-500"
                />
                <span className="flex-1 min-w-0">
                  <span className="font-mono font-bold text-navy-900">{order.orderNumber}</span> ·{' '}
                  <span className="font-medium text-gray-800">{order.client.name || order.client.phone}</span>
                  <span className="block text-gray-500 truncate mt-0.5">{order.deliveryAddress}</span>
                </span>
                <span className="font-semibold text-navy-900 shrink-0">{calculateOrderWeight(order.items)} kg</span>
              </label>
            ))}
          </div>
        </Card>
      ))}

      {selection.length > 0 && (
        <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-navy-900">
            <Truck size={18} />
            <h3 className="font-bold text-sm">{t('selectedLoad')}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-navy-900">
              {weightKg} kg {t('total')}
            </span>
            <span className="text-gray-600">
              {tStaff('suggestedTruck', { truck: suggested ? capacityLabels[suggested] : tStaff('aboveCapacity') })}
            </span>
            <select
              aria-label="Truck capacity"
              value={selectedCapacity}
              onChange={(event) => setCapacity(event.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs focus:border-navy-500 focus:outline-none"
            >
              <option value="">{tStaff('chooseTruck')}</option>
              {Object.entries(TRUCK_CAPACITY_KG).map(([k, kg]) => (
                <option key={k} value={k}>
                  {capacityLabels[k]} · {kg} kg
                </option>
              ))}
            </select>
            <Button
              loading={saving}
              disabled={!selectedCapacity || weightKg > maxKg}
              onClick={dispatch}
              className="h-9 px-4 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
            >
              {t('dispatchSelected')}
            </Button>
          </div>
          {selectedCapacity && (
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                <span>{t('kgUsed', { kg: weightKg })}</span>
                <span>{t('kgCapacity', { kg: maxKg })}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-orange-600 transition-all rounded-full"
                  style={{ width: `${Math.min((weightKg / maxKg) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
