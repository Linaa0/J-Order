import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, RefreshCw, Truck, Download, CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PRODUCT_LABELS, ORDER_STATUS_LABELS } from '@/lib/order-utils'
import { TRUCK_CAPACITY_KG, calculateOrderWeight, suggestTruckCapacity } from '@/lib/order-operations'
import { toast } from 'sonner'

type OrderRow = {
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
  useEffect(() => { void load().catch(() => toast.error(tCommon('generic'))) }, [load, tCommon])
  return <Card>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase font-semibold text-gray-500">{t('dailySummary')}</p>
        <h2 className="font-body text-xl font-bold text-navy-900">{t('ordersToday2', { count: summary?.totalOrders ?? 0 })}</h2>
      </div>
      <div className="flex items-center gap-2">
        <select aria-label="Previous summary date" value={selectedDate} onChange={(event) => { const date = event.target.value; setSelectedDate(date); void load(date || undefined) }} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900">
          <option value="">Today</option>
          {history.map((item) => <option key={item.summaryDate} value={new Date(item.summaryDate).toISOString().slice(0, 10)}>{new Date(item.summaryDate).toLocaleDateString()}</option>)}
        </select>
        <Button size="icon" variant="ghost" aria-label="Refresh summary" onClick={() => void load(selectedDate || undefined)}><RefreshCw size={16} /></Button>
      </div>
    </div>
    {summary && <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
      <div><p className="text-gray-500">{t('paidUnpaid', { paid: summary.paidOrders, unpaid: summary.unpaidOrders })}</p></div>
      <div><p className="text-gray-500">{t('byStatus')}</p><p className="font-semibold text-navy-900">{Object.entries(summary.statusCounts).filter(([, count]) => count).map(([status, count]) => `${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status} ${count}`).join(', ') || tCommon('noResults')}</p></div>
      <div><p className="text-gray-500">{t('productQuantities')}</p><p className="font-semibold text-navy-900">{Object.entries(summary.productTotals).filter(([, count]) => count).map(([product, count]) => `${PRODUCT_LABELS[product as keyof typeof PRODUCT_LABELS] ?? product} ${count}`).join(', ') || tCommon('noResults')}</p></div>
    </div>}
  </Card>
}

export function AdminOrdersPanel() {
  const t = useTranslations('admin')
  const tPayment = useTranslations('payment')
  const tCommon = useTranslations('common')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Payment Recording Modal State
  const [paymentOrder, setPaymentOrder] = useState<OrderRow | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'MTN_MOMO' | 'AIRTEL_MONEY' | 'CASH' | 'BANK_TRANSFER'>('MTN_MOMO')
  const [paymentAmount, setPaymentAmount] = useState<number>(10000)
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon('generic'))
    } finally { setLoading(false) }
  }, [page, status, payment, search, from, to, tCommon])

  useEffect(() => { void load() }, [load])

  function handleExportCsv() {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (payment) params.set('paymentStatus', payment)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    window.location.href = `/api/admin/orders/export?${params.toString()}`
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentOrder) return
    setRecordingPayment(true)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentOrder.id,
          method: paymentMethod,
          amountPaid: Number(paymentAmount),
          reference: paymentReference || undefined,
          note: paymentNote || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || tPayment('error'))
      toast.success(tPayment('success'))
      setPaymentOrder(null)
      setPaymentReference('')
      setPaymentNote('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tPayment('error'))
    } finally {
      setRecordingPayment(false)
    }
  }

  const grouped = useMemo(() => {
    const entries = new Map<string, OrderRow[]>()
    for (const order of orders) {
      const key = order.group?.id ?? `single:${order.id}`
      entries.set(key, [...(entries.get(key) ?? []), order])
    }
    return [...entries.entries()]
  }, [orders])

  const statusOptions = Object.keys(ORDER_STATUS_LABELS)

  return <div className="space-y-4">
    <SummaryWidget />
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-navy-900 text-sm">{t('orders')}</h3>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-9">
          <Download size={14} className="mr-1.5" />
          {t('exportCsv')}
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <input aria-label="Search orders" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={t('search')} className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:border-navy-900" />
        <select aria-label="Filter by order status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:border-navy-900"><option value="">{t('filterStatus')}</option>{statusOptions.map((option) => <option key={option} value={option}>{ORDER_STATUS_LABELS[option as keyof typeof ORDER_STATUS_LABELS]}</option>)}</select>
        <select aria-label="Filter by payment status" value={payment} onChange={(event) => { setPayment(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:border-navy-900"><option value="">{t('filterPayment')}</option><option value="PAID">{tPayment('PAID')}</option><option value="UNPAID">{tPayment('UNPAID')}</option></select>
        <input aria-label="From date" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:border-navy-900" />
        <input aria-label="To date" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:border-navy-900" />
      </div>
    </Card>
    <Card className="p-0 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-full table-fixed text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase text-navy-500">
            <tr>
              {[t('column_no'), t('column_order'), t('column_customer'), t('column_items'), t('column_purchase'), t('column_payment'), t('column_status'), t('column_location'), t('orderedAt'), ''].map((label, idx) => (
                <th key={label || idx} className="px-3 py-3 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!loading && grouped.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-gray-500">{t('noOrders')}</td></tr>}
            {grouped.flatMap(([key, rows], index) => {
              const first = rows[0]
              const isGroup = Boolean(first.group)
              const isExpanded = expanded.includes(key)
              const total = rows.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0)
              const mainRow = <tr key={key} className="align-top hover:bg-gray-50">
                <td className="px-3 py-3 text-gray-400">{(page - 1) * 25 + index + 1}</td>
                <td className="px-3 py-3">
                  <button className="flex items-center gap-1 text-left font-mono text-xs font-semibold text-navy-900" onClick={() => setExpanded((current) => isExpanded ? current.filter((item) => item !== key) : [...current, key])}>
                    {isGroup ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                    <span className="truncate max-w-[140px]" title={isGroup ? first.group?.reference ?? first.orderNumber : first.orderNumber}>{isGroup ? first.group?.reference ?? first.orderNumber : first.orderNumber}</span>
                  </button>
                  {isGroup && <div className="mt-1 text-[11px] text-navy-600">{first.group?.type === 'CUSTOMER_GROUP' ? t('customerGroup') : t('deliveryConsolidation')} · {rows.length} {t('orders')}</div>}
                </td>
                <td className="px-3 py-3">
                  <div className="truncate font-medium text-navy-900" title={first.client.name || first.client.phone}>{first.client.name || first.client.phone}</div>
                  <div className="mt-1 text-[11px] text-gray-500">{first.tinNumber ? `TIN: ${first.tinNumber}` : t('tinNotProvided')}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="truncate" title={first.items.map((item) => `${item.quantity} x ${PRODUCT_LABELS[item.product]}`).join(', ')}>{first.items.map((item) => `${item.quantity} x ${PRODUCT_LABELS[item.product]}`).join(', ')}</div>
                  <div className="mt-1 text-[11px] font-semibold text-navy-600">{t('totalItems', { total })}</div>
                </td>
                <td className="px-3 py-3 font-mono text-[11px] text-navy-700" title={first.purchaseCode}>{first.purchaseCode}</td>
                <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${first.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{first.paymentStatus === 'PAID' ? tPayment('PAID') : tPayment('UNPAID')}</span></td>
                <td className="px-3 py-3"><span className="inline-flex rounded-full bg-navy-100 px-2 py-1 text-xs font-semibold text-navy-700">{ORDER_STATUS_LABELS[first.status]}</span></td>
                <td className="px-3 py-3">
                  <div className="truncate max-w-[210px]" title={isGroup ? `${new Set(rows.map((order) => order.deliveryAddress)).size} delivery locations` : first.deliveryAddress}>{isGroup ? t('deliveryLocations', { count: new Set(rows.map((order) => order.deliveryAddress)).size }) : first.deliveryAddress}</div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{new Date(first.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => {
                      setPaymentOrder(first)
                      setPaymentAmount(10000)
                    }}
                  >
                    <CreditCard size={12} className="mr-1" />
                    {t('recordPayment')}
                  </Button>
                </td>
              </tr>
              const childRows = isGroup && isExpanded ? rows.map((order) => <tr key={order.id} className="bg-gray-50 text-xs">
                <td className="px-3 py-2 text-gray-400">{order.orderNumber}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{order.orderNumber}</td>
                <td className="px-3 py-2"><div className="font-medium text-navy-900">{order.client.name || order.client.phone}</div><div className="text-[10px] text-gray-500">{order.tinNumber ? `TIN: ${order.tinNumber}` : t('tinNotProvided')}</div></td>
                <td className="px-3 py-2">{order.items.map((item) => `${item.quantity} x ${PRODUCT_LABELS[item.product]}`).join(', ')}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{order.purchaseCode}</td>
                <td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{order.paymentStatus === 'PAID' ? tPayment('PAID') : tPayment('UNPAID')}</span></td>
                <td className="px-3 py-2"><span className="inline-flex rounded-full bg-navy-100 px-2 py-1 text-[10px] font-semibold text-navy-700">{ORDER_STATUS_LABELS[order.status]}</span></td>
                <td className="px-3 py-2 text-navy-600">{order.deliveryAddress}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-medium"
                    onClick={() => {
                      setPaymentOrder(order)
                      setPaymentAmount(10000)
                    }}
                  >
                    <CreditCard size={11} className="mr-1" />
                    {t('recordPayment')}
                  </Button>
                </td>
              </tr>) : []
              return [mainRow, ...childRows]
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3 p-3">
        {!loading && grouped.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">{t('noOrders')}</div>}
        {grouped.map(([key, rows], index) => {
          const first = rows[0]
          const isGroup = Boolean(first.group)
          const isExpanded = expanded.includes(key)
          const total = rows.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0)
          return (
            <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button className="flex items-center gap-2 text-left text-sm font-semibold text-navy-900" onClick={() => setExpanded((current) => isExpanded ? current.filter((item) => item !== key) : [...current, key])}>
                    {isGroup ? (isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : null}
                    <span className="truncate">{isGroup ? first.group?.reference ?? first.orderNumber : first.orderNumber}</span>
                  </button>
                  <p className="mt-1 text-xs text-gray-500">{first.client.name || first.client.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${first.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{first.paymentStatus === 'PAID' ? tPayment('PAID') : tPayment('UNPAID')}</span>
                  <span className="inline-flex rounded-full bg-navy-100 px-2 py-1 text-[10px] font-semibold text-navy-700">{ORDER_STATUS_LABELS[first.status]}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600">
                <div><span className="block text-[10px] uppercase tracking-wide text-gray-400">{t('column_purchase')}</span><span className="font-mono">{first.purchaseCode}</span></div>
                <div><span className="block text-[10px] uppercase tracking-wide text-gray-400">{t('column_items')}</span><span>{total}</span></div>
              </div>
              {isExpanded && isGroup && (
                <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                  {rows.map((order) => (
                    <div key={order.id} className="rounded-lg bg-gray-50 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px]">{order.orderNumber}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{order.paymentStatus === 'PAID' ? tPayment('PAID') : tPayment('UNPAID')}</span>
                      </div>
                      <p className="mt-1 text-navy-700">{order.deliveryAddress}</p>
                    </div>
                  ))}
                </div>
              )}
              {!isGroup && (
                <div className="mt-3 text-xs text-gray-500">
                  <p>{first.deliveryAddress}</p>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-100 pt-2">
                <span>{(page - 1) * 25 + index + 1}</span>
                <span>{new Date(first.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => {
                    setPaymentOrder(first)
                    setPaymentAmount(10000)
                  }}
                >
                  <CreditCard size={12} className="mr-1" />
                  {t('recordPayment')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm"><span>{t('pageOf', { page, pages })}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>{t('previous')}</Button><Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>{t('next')}</Button></div></div>
    </Card>

    {/* Record Payment Dialog */}
    {paymentOrder && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-base font-bold text-navy-900">{t('recordPayment')}</h3>
            <button
              type="button"
              onClick={() => setPaymentOrder(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              aria-label={tCommon('cancel')}
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500">{t('column_order')}</span>
              <p className="font-mono text-sm font-semibold text-navy-900">{paymentOrder.orderNumber} ({paymentOrder.client.name || paymentOrder.client.phone})</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{tPayment('method')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CASH' | 'BANK_TRANSFER')}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-navy-900 focus:outline-none"
              >
                <option value="MTN_MOMO">{tPayment('MTN_MOMO')}</option>
                <option value="AIRTEL_MONEY">{tPayment('AIRTEL_MONEY')}</option>
                <option value="CASH">{tPayment('CASH')}</option>
                <option value="BANK_TRANSFER">{tPayment('BANK_TRANSFER')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{tPayment('amount')}</label>
              <input
                type="number"
                min="100"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-navy-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{tPayment('reference')}</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. MOMO-98234"
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-navy-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{tPayment('note')}</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-navy-900 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPaymentOrder(null)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" className="flex-1" loading={recordingPayment}>
                {tCommon('save')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
}

export function ConsolidationPanel() {
  const t = useTranslations('admin')
  const tStaff = useTranslations('staff')
  const tCommon = useTranslations('common')
  const [clusters, setClusters] = useState<Array<{ key: string; orders: OrderRow[]; weightKg: number; suggestedTruck: keyof typeof TRUCK_CAPACITY_KG | null; hasEscalated: boolean }>>([])
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
  useEffect(() => { void load().catch((error) => toast.error(error.message)) }, [load])
  const selectedOrders = clusters.flatMap((cluster) => cluster.orders).filter((order) => selection.includes(order.id))
  const weightKg = selectedOrders.reduce((sum, order) => sum + calculateOrderWeight(order.items), 0)
  const suggested = suggestTruckCapacity(weightKg)
  const selectedCapacity = capacity || suggested || ''
  const maxKg = selectedCapacity ? TRUCK_CAPACITY_KG[selectedCapacity as keyof typeof TRUCK_CAPACITY_KG] : 0
  async function saveSettings() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/summaries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consolidationSizeKg: threshold, maxConsolidationDistanceKm: distance, maxConsolidationWaitHours: maxWait, dailySummaryHour: 18 }) })
      if (!response.ok) throw new Error(tCommon('retry'))
      toast.success(t('saveSettings'))
    } catch (error) { toast.error(error instanceof Error ? error.message : tCommon('retry')) } finally { setSaving(false) }
  }
  async function dispatch() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/consolidation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: selection, truckCapacity: selectedCapacity }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || tCommon('retry'))
      toast.success(`${t('dispatchSelected')}: ${data.data.group.reference}`)
      setSelection([])
      setCapacity('')
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : tCommon('retry')) } finally { setSaving(false) }
  }
  return <div className="space-y-4">
    <Card>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-navy-900">{t('consolidationThreshold')}<input type="number" min="1" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="mt-1 block h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm focus:border-navy-900 focus:outline-none" /></label>
        <label className="text-sm font-medium text-navy-900">{t('maxDistance')}<input type="number" min="0.1" step="0.1" value={distance} onChange={(event) => setDistance(Number(event.target.value))} className="mt-1 block h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm focus:border-navy-900 focus:outline-none" /></label>
        <label className="text-sm font-medium text-navy-900">{t('maxWait')}<input type="number" min="1" value={maxWait} onChange={(event) => setMaxWait(Number(event.target.value))} className="mt-1 block h-10 w-36 rounded-lg border border-gray-300 px-3 text-sm focus:border-navy-900 focus:outline-none" /></label>
        <Button loading={saving} onClick={saveSettings}>{t('saveSettings')}</Button>
      </div>
    </Card>
    {clusters.length === 0 && <Card><p className="text-center text-gray-500 py-6">{t('noConsolidation')}</p></Card>}
    {clusters.map((cluster) => <Card key={cluster.key}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-navy-900">{cluster.key}</h3>
          <p className="text-sm text-gray-500">{cluster.orders.length} {t('orders')} · {cluster.weightKg} kg {t('estimated')}</p>
        </div>
        {cluster.hasEscalated && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">{t('needsAttention')}</span>}
      </div>
      <div className="space-y-2">
        {cluster.orders.map((order) => (
          <label key={order.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={selection.includes(order.id)} onChange={(event) => setSelection((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))} className="mt-1 rounded" />
            <span className="flex-1">
              <span className="font-mono font-medium text-navy-900">{order.orderNumber}</span> · {order.client.name || order.client.phone}
              <span className="block text-xs text-gray-500">{order.deliveryAddress}</span>
            </span>
            <span className="font-medium text-navy-900">{calculateOrderWeight(order.items)} kg</span>
          </label>
        ))}
      </div>
    </Card>)}
    {selection.length > 0 && (
      <Card>
        <div className="flex items-center gap-2 text-navy-900">
          <Truck size={18} />
          <h3 className="font-semibold">{t('selectedLoad')}</h3>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-navy-900">{weightKg} kg {t('total')}</span>
          <span className="text-gray-600">{tStaff('suggestedTruck', { truck: suggested ? capacityLabels[suggested] : tStaff('aboveCapacity') })}</span>
          <select aria-label="Truck capacity" value={selectedCapacity} onChange={(event) => setCapacity(event.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-navy-900 focus:outline-none">
            <option value="">{tStaff('chooseTruck')}</option>
            {Object.entries(TRUCK_CAPACITY_KG).map(([key, kg]) => <option key={key} value={key}>{capacityLabels[key]} · {kg} kg</option>)}
          </select>
          <Button loading={saving} disabled={!selectedCapacity || weightKg > maxKg} onClick={dispatch}>{t('dispatchSelected')}</Button>
        </div>
        {selectedCapacity && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-gray-600">
              <span>{t('kgUsed', { kg: weightKg })}</span>
              <span>{t('kgCapacity', { kg: maxKg })}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full bg-orange-600 transition-all" style={{ width: `${Math.min((weightKg / maxKg) * 100, 100)}%` }} />
            </div>
          </div>
        )}
      </Card>
    )}
  </div>
}
