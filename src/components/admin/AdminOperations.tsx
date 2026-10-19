'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, RefreshCw, Truck } from 'lucide-react'
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
  const tPayment = useTranslations('payment')
  const tCommon = useTranslations('common')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [history, setHistory] = useState<Array<{ summaryDate: string; payload: Summary }>>([])
  const [selectedDate, setSelectedDate] = useState('')
  const load = useCallback(async (date?: string) => {
    const response = await fetch(`/api/admin/summaries${date ? `?date=${date}` : ''}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || tCommon('errorGeneric'))
    setSummary(data.data.current)
    setHistory(data.data.history)
  }, [])
  useEffect(() => { void load().catch(() => toast.error(tCommon('errorGeneric'))) }, [load])
  return <Card>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase font-semibold text-navy-400">{t('dailySummary')}</p>
        <h2 className="font-display text-xl font-bold text-navy-900">{t('ordersToday2', { count: summary?.totalOrders ?? 0 })}</h2>
      </div>
      <div className="flex items-center gap-2">
        <select aria-label="Previous summary date" value={selectedDate} onChange={(event) => { const date = event.target.value; setSelectedDate(date); void load(date || undefined) }} className="h-10 rounded-lg border border-navy-200 bg-white px-3 text-sm">
          <option value="">Today</option>
          {history.map((item) => <option key={item.summaryDate} value={new Date(item.summaryDate).toISOString().slice(0, 10)}>{new Date(item.summaryDate).toLocaleDateString()}</option>)}
        </select>
        <Button size="icon" variant="ghost" aria-label="Refresh summary" onClick={() => void load(selectedDate || undefined)}><RefreshCw size={16} /></Button>
      </div>
    </div>
    {summary && <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
      <div><p className="text-navy-400">{t('paidUnpaid', { paid: summary.paidOrders, unpaid: summary.unpaidOrders })}</p></div>
      <div><p className="text-navy-400">{t('byStatus')}</p><p className="font-semibold">{Object.entries(summary.statusCounts).filter(([, count]) => count).map(([status, count]) => `${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]} ${count}`).join(', ') || tCommon('noResults')}</p></div>
      <div><p className="text-navy-400">{t('productQuantities')}</p><p className="font-semibold">{Object.entries(summary.productTotals).filter(([, count]) => count).map(([product, count]) => `${PRODUCT_LABELS[product as keyof typeof PRODUCT_LABELS]} ${count}`).join(', ') || tCommon('noResults')}</p></div>
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
      if (!response.ok) throw new Error(data.error || tCommon('errorGeneric'))
      setOrders(data.data)
      setPages(Math.max(1, data.pagination.pages))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon('errorGeneric'))
    } finally { setLoading(false) }
  }, [page, status, payment, search, from, to])
  useEffect(() => { void load() }, [load])
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
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <input aria-label="Search orders" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={t('search')} className="h-10 rounded-lg border border-navy-200 px-3 text-sm" />
        <select aria-label="Filter by order status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-navy-200 bg-white px-3 text-sm"><option value="">{t('filterStatus')}</option>{statusOptions.map((option) => <option key={option} value={option}>{ORDER_STATUS_LABELS[option as keyof typeof ORDER_STATUS_LABELS]}</option>)}</select>
        <select aria-label="Filter by payment status" value={payment} onChange={(event) => { setPayment(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-navy-200 bg-white px-3 text-sm"><option value="">{t('filterPayment')}</option><option value="PAID">{tPayment('PAID')}</option><option value="UNPAID">{tPayment('UNPAID')}</option></select>
        <input aria-label="From date" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-navy-200 px-3 text-sm" />
        <input aria-label="To date" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1) }} className="h-10 rounded-lg border border-navy-200 px-3 text-sm" />
      </div>
    </Card>
    <Card className="p-0 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-full table-fixed text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase text-navy-500"><tr>{[t('column_no'), t('column_order'), t('column_customer'), t('column_items'), t('column_purchase'), t('column_payment'), t('column_status'), t('column_location'), t('orderedAt')].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-navy-100">
            {!loading && grouped.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-navy-400">{t('noOrders')}</td></tr>}
            {grouped.flatMap(([key, rows], index) => {
              const first = rows[0]
              const isGroup = Boolean(first.group)
              const isExpanded = expanded.includes(key)
              const total = rows.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0)
              const mainRow = <tr key={key} className="align-top hover:bg-navy-50/60">
                <td className="px-3 py-3 text-navy-400">{(page - 1) * 25 + index + 1}</td>
                <td className="px-3 py-3">
                  <button className="flex items-center gap-1 text-left font-mono text-xs font-semibold text-navy-900" onClick={() => setExpanded((current) => isExpanded ? current.filter((item) => item !== key) : [...current, key])}>
                    {isGroup ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                    <span className="truncate max-w-[140px]" title={isGroup ? first.group?.reference ?? first.orderNumber : first.orderNumber}>{isGroup ? first.group?.reference ?? first.orderNumber : first.orderNumber}</span>
                  </button>
                  {isGroup && <div className="mt-1 text-[11px] text-ember-700">{first.group?.type === 'CUSTOMER_GROUP' ? t('customerGroup') : t('deliveryConsolidation')} · {rows.length} {t('orders')}</div>}
                </td>
                <td className="px-3 py-3">
                  <div className="truncate font-medium text-navy-900" title={first.client.name || first.client.phone}>{first.client.name || first.client.phone}</div>
                  <div className="mt-1 text-[11px] text-navy-500">{first.tinNumber ? `TIN: ${first.tinNumber}` : t('tinNotProvided')}</div>
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
                <td className="px-3 py-3 whitespace-nowrap text-xs text-navy-500">{new Date(first.createdAt).toLocaleString()}</td>
              </tr>
              const childRows = isGroup && isExpanded ? rows.map((order) => <tr key={order.id} className="bg-amber-50/50 text-xs"><td className="px-3 py-2 text-navy-400">{order.orderNumber}</td><td className="px-3 py-2 font-mono text-[11px]">{order.orderNumber}</td><td className="px-3 py-2"><div className="font-medium text-navy-900">{order.client.name || order.client.phone}</div><div className="text-[10px] text-navy-500">{order.tinNumber ? `TIN: ${order.tinNumber}` : t('tinNotProvided')}</div></td><td className="px-3 py-2">{order.items.map((item) => `${item.quantity} x ${PRODUCT_LABELS[item.product]}`).join(', ')}</td><td className="px-3 py-2 font-mono text-[11px]">{order.purchaseCode}</td><td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{order.paymentStatus === 'PAID' ? tPayment('PAID') : tPayment('UNPAID')}</span></td><td className="px-3 py-2"><span className="inline-flex rounded-full bg-navy-100 px-2 py-1 text-[10px] font-semibold text-navy-700">{ORDER_STATUS_LABELS[order.status]}</span></td><td className="px-3 py-2 text-navy-600">{order.deliveryAddress}</td><td className="px-3 py-2 whitespace-nowrap text-[10px] text-navy-500">{new Date(order.createdAt).toLocaleString()}</td></tr>) : []
              return [mainRow, ...childRows]
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3 p-3">
        {!loading && grouped.length === 0 && <div className="rounded-2xl border border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">{t('noOrders')}</div>}
        {grouped.map(([key, rows], index) => {
          const first = rows[0]
          const isGroup = Boolean(first.group)
          const isExpanded = expanded.includes(key)
          const total = rows.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0)
          return (
            <div key={key} className="rounded-2xl border border-navy-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button className="flex items-center gap-2 text-left text-sm font-semibold text-navy-900" onClick={() => setExpanded((current) => isExpanded ? current.filter((item) => item !== key) : [...current, key])}>
                    {isGroup ? (isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : null}
                    <span className="truncate">{isGroup ? first.group?.reference ?? first.orderNumber : first.orderNumber}</span>
                  </button>
                  <p className="mt-1 text-xs text-navy-500">{first.client.name || first.client.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${first.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{first.paymentStatus === 'PAID' ? tPayment('PAID') : tPayment('UNPAID')}</span>
                  <span className="inline-flex rounded-full bg-navy-100 px-2 py-1 text-[10px] font-semibold text-navy-700">{ORDER_STATUS_LABELS[first.status]}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600">
                <div><span className="block text-[10px] uppercase tracking-wide text-navy-400">{t('column_purchase')}</span><span className="font-mono">{first.purchaseCode}</span></div>
                <div><span className="block text-[10px] uppercase tracking-wide text-navy-400">{t('column_items')}</span><span>{total}</span></div>
              </div>
              {isExpanded && isGroup && (
                <div className="mt-3 space-y-2 border-t border-navy-100 pt-3">
                  {rows.map((order) => (
                    <div key={order.id} className="rounded-xl bg-navy-50 p-2 text-xs">
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
                <div className="mt-3 text-xs text-navy-500">
                  <p>{first.deliveryAddress}</p>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-[10px] text-navy-500">
                <span>{(page - 1) * 25 + index + 1}</span>
                <span>{new Date(first.createdAt).toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm"><span>{t('pageOf', { page, pages })}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>{t('previous')}</Button><Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((value) => value + 1)}>{t('next')}</Button></div></div>
    </Card>
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
    if (!response.ok) throw new Error(data.error || tCommon('errorGeneric'))
    setClusters(data.data.clusters)
    setDistance(data.data.settings.maxConsolidationDistanceKm)
    setMaxWait(data.data.settings.maxConsolidationWaitHours)
    setThreshold(data.data.settings.consolidationSizeKg)
  }, [])
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
      if (!response.ok) throw new Error(tCommon('errorGeneric'))
      toast.success(t('saveSettings'))
    } catch (error) { toast.error(error instanceof Error ? error.message : tCommon('errorGeneric')) } finally { setSaving(false) }
  }
  async function dispatch() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/consolidation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: selection, truckCapacity: selectedCapacity }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || tCommon('errorGeneric'))
      toast.success(`${t('dispatchSelected')}: ${data.data.group.reference}`)
      setSelection([])
      setCapacity('')
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : tCommon('errorGeneric')) } finally { setSaving(false) }
  }
  return <div className="space-y-4">
    <Card><div className="flex flex-wrap items-end gap-3"><label className="text-sm">{t('consolidationThreshold')}<input type="number" min="1" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="mt-1 block h-10 w-36 rounded-lg border border-navy-200 px-3" /></label><label className="text-sm">{t('maxDistance')}<input type="number" min="0.1" step="0.1" value={distance} onChange={(event) => setDistance(Number(event.target.value))} className="mt-1 block h-10 w-36 rounded-lg border border-navy-200 px-3" /></label><label className="text-sm">{t('maxWait')}<input type="number" min="1" value={maxWait} onChange={(event) => setMaxWait(Number(event.target.value))} className="mt-1 block h-10 w-36 rounded-lg border border-navy-200 px-3" /></label><Button loading={saving} onClick={saveSettings}>{t('saveSettings')}</Button></div></Card>
    {clusters.length === 0 && <Card><p className="text-center text-navy-400">{t('noConsolidation')}</p></Card>}
    {clusters.map((cluster) => <Card key={cluster.key}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-navy-900">{cluster.key}</h3><p className="text-sm text-navy-500">{cluster.orders.length} {t('orders')} · {cluster.weightKg} kg {t('estimated')}</p></div>{cluster.hasEscalated && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">{t('needsAttention')}</span>}</div>
      <div className="space-y-2">{cluster.orders.map((order) => <label key={order.id} className="flex items-start gap-3 rounded-lg border border-navy-100 p-3 text-sm"><input type="checkbox" checked={selection.includes(order.id)} onChange={(event) => setSelection((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))} /><span className="flex-1"><span className="font-mono">{order.orderNumber}</span> · {order.client.name || order.client.phone}<span className="block text-xs text-navy-500">{order.deliveryAddress}</span></span><span>{calculateOrderWeight(order.items)} kg</span></label>)}</div>
    </Card>)}
    {selection.length > 0 && <Card><div className="flex items-center gap-2"><Truck size={18} /><h3 className="font-semibold">{t('selectedLoad')}</h3></div><div className="mt-3 flex flex-wrap items-center gap-3"><span>{weightKg} kg {t('total')}</span><span>{tStaff('suggestedTruck', { truck: suggested ? capacityLabels[suggested] : tStaff('aboveCapacity') })}</span><select aria-label="Truck capacity" value={selectedCapacity} onChange={(event) => setCapacity(event.target.value)} className="h-10 rounded-lg border border-navy-200 bg-white px-3"><option value="">{tStaff('chooseTruck')}</option>{Object.entries(TRUCK_CAPACITY_KG).map(([key, kg]) => <option key={key} value={key}>{capacityLabels[key]} · {kg} kg</option>)}</select><Button loading={saving} disabled={!selectedCapacity || weightKg > maxKg} onClick={dispatch}>{t('dispatchSelected')}</Button></div>{selectedCapacity && <div className="mt-3"><div className="mb-1 flex justify-between text-xs"><span>{t('kgUsed', { kg: weightKg })}</span><span>{t('kgCapacity', { kg: maxKg })}</span></div><div className="h-2 rounded-full bg-navy-100 overflow-hidden"><div className="h-full bg-ember-600 transition-all" style={{ width: `${Math.min((weightKg / maxKg) * 100, 100)}%` }} /></div></div>}</Card>}
  </div>
}
