'use client'

import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import {
  Package,
  Clock,
  Truck,
  CreditCard,
  Search,
  Filter,
  ChevronRight,
  MapPin,
  Calendar,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { useLivePolling } from '@/hooks/useLivePolling'
import { toast } from 'sonner'

interface OrderItem {
  id: string
  product: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface OrderData {
  id: string
  orderNumber: string
  purchaseCode: string
  status: string
  paymentStatus: string
  preferredDate: string
  preferredTime: string | null
  deliveryAddress: string
  totalAmount: number
  createdAt: string
  client: {
    id: string
    name: string | null
    phone: string | null
  } | null
  items: OrderItem[]
}

interface TruckData {
  id: string
  plateNumber: string
  name: string
  capacityKg: number
  status: string
  isActive: boolean
}

interface SummaryData {
  totalOrders: number
  statusCounts: Record<string, number>
  paidOrders: number
  unpaidOrders: number
}

interface SummaryHistoryItem {
  summaryDate: string
  payload?: {
    totalOrders?: number
  }
}

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void
}

export function OrderStatusPill({ status }: { status: string }) {
  const tStatus = useTranslations('status')
  let colorStyles = 'bg-gray-100 text-gray-800 border-gray-200'
  switch (status) {
    case 'PENDING':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-200/80'
      break
    case 'CONFIRMED':
      colorStyles = 'bg-blue-50 text-blue-800 border-blue-200/80'
      break
    case 'PROCESSING':
      colorStyles = 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
      break
    case 'OUT_FOR_DELIVERY':
      colorStyles = 'bg-orange-50 text-orange-800 border-orange-200/80'
      break
    case 'DELIVERED':
    case 'COMPLETED':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
      break
    case 'CANCELLED':
      colorStyles = 'bg-red-50 text-red-800 border-red-200/80'
      break
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', colorStyles)}>
      {tStatus(status)}
    </span>
  )
}

export function PaymentStatusPill({ status }: { status: string }) {
  const tPayment = useTranslations('payment')
  let colorStyles = 'bg-gray-100 text-gray-800 border-gray-200'
  switch (status) {
    case 'PAID':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
      break
    case 'UNPAID':
      colorStyles = 'bg-red-50 text-red-800 border-red-200/80'
      break
    case 'PARTIAL':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-200/80'
      break
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', colorStyles)}>
      {tPayment(status)}
    </span>
  )
}

export function DashboardOverview({ onNavigateTab }: DashboardOverviewProps) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')
  const tProducts = useTranslations('products')
  const locale = useLocale()

  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [history, setHistory] = useState<SummaryHistoryItem[]>([])
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([])
  const [allOrders, setAllOrders] = useState<OrderData[]>([])
  const [trucks, setTrucks] = useState<TruckData[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Search states for Recent Orders table
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedPayment, setSelectedPayment] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)

  // Handle outside click to close filter popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setFilterPopoverOpen(false)
      }
    }
    if (filterPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filterPopoverOpen])

  const knownOrderIdsRef = useRef<Set<string> | null>(null)
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set())

  const fetchOverviewData = useCallback(async () => {
    try {
      const [summariesRes, ordersRes, trucksRes] = await Promise.all([
        fetch('/api/admin/summaries'),
        fetch('/api/admin/orders?limit=100'),
        fetch('/api/admin/trucks'),
      ])

      const [summariesData, ordersData, trucksData] = await Promise.all([
        summariesRes.json(),
        ordersRes.json(),
        trucksRes.json(),
      ])

      if (summariesData.data) {
        setSummary(summariesData.data.current ?? null)
        setHistory(summariesData.data.history ?? [])
      }

      if (ordersData.data) {
        const incomingOrders: OrderData[] = ordersData.data
        if (knownOrderIdsRef.current !== null) {
          const fresh = incomingOrders.filter((o) => !knownOrderIdsRef.current?.has(o.id))
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
        knownOrderIdsRef.current = new Set(incomingOrders.map((o) => o.id))
        setAllOrders(incomingOrders)
      }

      if (trucksData.data) {
        setTrucks(trucksData.data)
      }
    } catch {
      // Handled cleanly with empty states
    } finally {
      setLoading(false)
    }
  }, [])

  const { secondsAgo, refresh, isRefreshing } = useLivePolling(fetchOverviewData, {
    intervalMs: 10000,
  })

  useEffect(() => {
    void fetchOverviewData()
  }, [fetchOverviewData])

  // Fetch or filter recent orders
  useEffect(() => {
    let filtered = [...allOrders]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.purchaseCode.toLowerCase().includes(q) ||
          (o.client?.name && o.client.name.toLowerCase().includes(q)) ||
          (o.client?.phone && o.client.phone.includes(q))
      )
    }

    if (selectedStatus) {
      filtered = filtered.filter((o) => o.status === selectedStatus)
    }

    if (selectedPayment) {
      filtered = filtered.filter((o) => o.paymentStatus === selectedPayment)
    }

    if (fromDate) {
      filtered = filtered.filter((o) => new Date(o.createdAt) >= new Date(fromDate))
    }

    if (toDate) {
      filtered = filtered.filter((o) => new Date(o.createdAt) <= new Date(`${toDate}T23:59:59.999`))
    }

    setRecentOrders(filtered.slice(0, 8))
  }, [allOrders, searchQuery, selectedStatus, selectedPayment, fromDate, toDate])

  const activeFiltersCount =
    (selectedStatus ? 1 : 0) + (selectedPayment ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0)

  // Localized date formatting
  const formatLocaleDate = useCallback(
    (dateString: string | Date) => {
      try {
        const d = typeof dateString === 'string' ? new Date(dateString) : dateString
        const loc = locale === 'rw' ? 'rw-RW' : locale === 'fr' ? 'fr-FR' : locale === 'sw' ? 'sw-KE' : 'en-US'
        return new Intl.DateTimeFormat(loc, { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
      } catch {
        return String(dateString)
      }
    },
    [locale]
  )

  // Format Items summary helper
  const formatItemsSummary = useCallback(
    (items: OrderItem[]) => {
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

  // Calculate Today's deliveries & Upcoming deliveries
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const todaysDeliveries = useMemo(() => {
    return allOrders.filter((o) => {
      if (!o.preferredDate) return false
      const dStr = new Date(o.preferredDate).toISOString().slice(0, 10)
      return dStr === todayStr && o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
    })
  }, [allOrders, todayStr])

  const upcomingDeliveries = useMemo(() => {
    return allOrders
      .filter((o) => {
        if (!o.preferredDate) return false
        const dStr = new Date(o.preferredDate).toISOString().slice(0, 10)
        return dStr > todayStr && o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
      })
      .slice(0, 5)
  }, [allOrders, todayStr])

  // Trustworthy comparison calculation for "vs yesterday"
  const comparisonPill = useMemo(() => {
    if (!history || history.length === 0 || !summary) return null
    const yesterdaySummary = history[0]
    if (!yesterdaySummary || typeof yesterdaySummary.payload?.totalOrders !== 'number') return null

    const diff = summary.totalOrders - yesterdaySummary.payload.totalOrders
    const sign = diff > 0 ? `+${diff}` : `${diff}`
    return {
      text: t('vsYesterday', { diff: sign }),
      positive: diff >= 0,
    }
  }, [history, summary, t])

  const truckStatusDot = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500'
      case 'LOADING':
        return 'bg-amber-500'
      case 'ON_TRIP':
        return 'bg-blue-500'
      case 'MAINTENANCE':
      default:
        return 'bg-red-500'
    }
  }

  const truckStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return t('truckStatusAvailable')
      case 'LOADING':
        return t('truckStatusLoading')
      case 'ON_TRIP':
        return t('truckStatusOnTrip')
      case 'MAINTENANCE':
      default:
        return t('truckStatusMaintenance')
    }
  }

  return (
    <div className="space-y-6">
      {/* Live Polling Status Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Live</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">Updated {secondsAgo}s ago</span>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-navy-900 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={cn(isRefreshing && 'animate-spin')} />
          <span>{tCommon('refresh')}</span>
        </button>
      </div>

      {/* 1. ROW OF 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Orders Today */}
        <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-7 bg-gray-100 rounded w-1/3" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                {comparisonPill && (
                  <span
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      comparisonPill.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    )}
                  >
                    {comparisonPill.text}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('ordersToday')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-0.5">
                  {summary ? summary.totalOrders : 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('placedToday')}</p>
              </div>
            </div>
          )}
        </Card>

        {/* KPI 2: Awaiting Confirmation */}
        <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-7 bg-gray-100 rounded w-1/3" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('awaitingConfirmation')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-0.5">
                  {summary?.statusCounts?.PENDING ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('needsReview')}</p>
              </div>
            </div>
          )}
        </Card>

        {/* KPI 3: Out for Delivery */}
        <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-7 bg-gray-100 rounded w-1/3" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Truck className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('outForDelivery')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-0.5">
                  {summary?.statusCounts?.OUT_FOR_DELIVERY ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('inTransit')}</p>
              </div>
            </div>
          )}
        </Card>

        {/* KPI 4: Unpaid Orders */}
        <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-7 bg-gray-100 rounded w-1/3" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">{t('unpaidOrders')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-navy-900 mt-0.5">
                  {summary ? summary.unpaidOrders : 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('awaitingPayment')}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 2. TWO-COLUMN LAYOUT: MAIN AREA (RECENT ORDERS) & RIGHT COLUMN (DELIVERIES + TRUCKS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT / MAIN AREA: RECENT ORDERS (Col 8 on xl) */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="border border-gray-200/80 rounded-xl bg-white shadow-xs overflow-hidden">
            {/* Header: Title, Search, Filters, See All */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-navy-900 tracking-tight">{t('recentOrders')}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {recentOrders.length}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search field */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('search')}
                    className="h-9 w-full pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:outline-none focus:border-navy-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters popover button */}
                <div className="relative" ref={filterPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setFilterPopoverOpen(!filterPopoverOpen)}
                    className={cn(
                      'h-9 px-3 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition',
                      activeFiltersCount > 0
                        ? 'border-navy-900 bg-navy-50 text-navy-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{t('filters')}</span>
                    {activeFiltersCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-navy-900 text-white text-[10px] flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* Filters Popover Content */}
                  {filterPopoverOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-40 space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-navy-900 uppercase tracking-wide">{t('filters')}</span>
                        {activeFiltersCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStatus('')
                              setSelectedPayment('')
                              setFromDate('')
                              setToDate('')
                            }}
                            className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
                          >
                            {t('clearFilters')}
                          </button>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">{t('column_status')}</label>
                        <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full h-8 text-xs px-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-navy-500"
                        >
                          <option value="">{t('filterStatus')}</option>
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      {/* Payment */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">{t('column_payment')}</label>
                        <select
                          value={selectedPayment}
                          onChange={(e) => setSelectedPayment(e.target.value)}
                          className="w-full h-8 text-xs px-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-navy-500"
                        >
                          <option value="">{t('filterPayment')}</option>
                          <option value="PAID">PAID</option>
                          <option value="PARTIAL">PARTIAL</option>
                          <option value="UNPAID">UNPAID</option>
                        </select>
                      </div>

                      {/* Date Range */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">{t('fromDate')}</label>
                          <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full h-8 text-xs px-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-navy-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">{t('toDate')}</label>
                          <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full h-8 text-xs px-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-navy-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* See all link */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('orders')}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 shrink-0 px-2 py-1"
                >
                  <span>{t('seeAll')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-navy-900">{t('noOrders')}</p>
                  <p className="text-xs text-gray-500 mt-1">{tCommon('noResults')}</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-500 uppercase text-[11px] font-semibold border-b border-gray-100">
                      <th className="py-3 px-4">{t('column_order')}</th>
                      <th className="py-3 px-4">{t('column_customer')}</th>
                      <th className="py-3 px-4 hidden md:table-cell">{t('column_items')}</th>
                      <th className="py-3 px-4">{t('column_payment')}</th>
                      <th className="py-3 px-4">{t('column_status')}</th>
                      <th className="py-3 px-4 hidden sm:table-cell">{t('orderedAt')}</th>
                      <th className="py-3 px-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => onNavigateTab(`orders&orderId=${order.id}`)}
                        className={cn(
                          'hover:bg-gray-50/80 transition-colors cursor-pointer',
                          newlyAddedIds.has(order.id) && 'bg-orange-50/80 border-l-2 border-orange-500'
                        )}
                      >
                        <td className="py-3.5 px-4 font-semibold text-navy-900 whitespace-nowrap">
                          {order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-navy-900">{order.client?.name || t('unnamed')}</p>
                          <p className="text-xs text-gray-500">{order.client?.phone || '—'}</p>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 hidden md:table-cell max-w-[200px] truncate">
                          {formatItemsSummary(order.items)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PaymentStatusPill status={order.paymentStatus} />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <OrderStatusPill status={order.status} />
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                          {formatLocaleDate(order.createdAt)}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: TODAY'S DELIVERIES, UPCOMING DELIVERIES, TRUCKS (Col 4 on xl) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Card 1: Today's Deliveries */}
          <Card className="border border-gray-200/80 rounded-xl bg-white shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-navy-900 tracking-tight">{t('todaysDeliveries')}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {todaysDeliveries.length}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : todaysDeliveries.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-gray-500">{t('noDeliveriesToday')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysDeliveries.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onNavigateTab(`orders&orderId=${order.id}`)}
                    className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-navy-900 line-clamp-1">
                        {formatItemsSummary(order.items)}
                      </p>
                      <OrderStatusPill status={order.status} />
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{order.client?.name || t('unnamed')}</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5">
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{order.deliveryAddress || '—'}</span>
                      </span>
                      {order.preferredTime && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{order.preferredTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Card 2: Upcoming Deliveries */}
          <Card className="border border-gray-200/80 rounded-xl bg-white shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-navy-900 tracking-tight">{t('upcomingDeliveries')}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {upcomingDeliveries.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
              >
                <span>{t('seeAll')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : upcomingDeliveries.length === 0 ? (
              <div className="py-6 text-center">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs text-gray-500">{t('noUpcomingDeliveries')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeliveries.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onNavigateTab(`orders&orderId=${order.id}`)}
                    className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-navy-900 line-clamp-1">
                        {formatItemsSummary(order.items)}
                      </p>
                      <OrderStatusPill status={order.status} />
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{order.client?.name || t('unnamed')}</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5">
                      <span className="flex items-center gap-1 shrink-0 font-medium text-navy-800">
                        <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{formatLocaleDate(order.preferredDate)}</span>
                      </span>
                      {order.preferredTime && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{order.preferredTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Card 3: Compact Trucks Card */}
          <Card className="border border-gray-200/80 rounded-xl bg-white shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-navy-900 tracking-tight">{t('truckFleet')}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {trucks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('trucks')}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-0.5"
              >
                <span>{t('seeAll')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : trucks.length === 0 ? (
              <div className="py-6 text-center">
                <Truck className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs text-gray-500">{t('noTrucks')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {trucks.map((truck) => (
                  <div key={truck.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', truckStatusDot(truck.status))} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-navy-900 truncate">{truck.name}</p>
                        <p className="text-[11px] font-mono text-gray-500">{truck.plateNumber}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-navy-800">{truckStatusText(truck.status)}</p>
                      <p className="text-[11px] text-gray-400">{truck.capacityKg} kg</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
