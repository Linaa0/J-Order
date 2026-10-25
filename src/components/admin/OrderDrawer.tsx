'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  X,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OrderStatusPill, PaymentStatusPill } from '@/components/admin/DashboardOverview'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface StatusHistoryItem {
  id: string
  oldStatus: string
  newStatus: string
  reason: string | null
  createdAt: string
  user?: {
    id: string
    name: string | null
    role: string
  } | null
}

interface OrderDrawerData {
  id: string
  orderNumber: string
  purchaseCode: string
  status: string
  paymentStatus: string
  amountDue: number | null
  amountPaid: number
  tinNumber: string | null
  companyName: string | null
  notes: string | null
  deliveryAddress: string
  preferredDate: string
  preferredTime: string | null
  cancellationReason: string | null
  createdAt: string
  client: {
    id: string
    name: string | null
    phone: string | null
  } | null
  assignedTo: {
    id: string
    name: string | null
    phone: string | null
  } | null
  items: Array<{
    id: string
    product: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  statusHistory?: StatusHistoryItem[]
}

interface StaffOption {
  id: string
  name: string | null
  phone: string | null
  role: string
  isActive: boolean
}

interface OrderDrawerProps {
  orderId: string | null
  isOpen: boolean
  onClose: () => void
  onOrderUpdated: () => void
  initialAction?: 'view' | 'payment' | 'status'
}

export function OrderDrawer({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
  initialAction = 'view',
}: OrderDrawerProps) {
  const t = useTranslations('admin')
  const tPayment = useTranslations('payment')
  const tCommon = useTranslations('common')
  const tProducts = useTranslations('products')
  const locale = useLocale()

  const [order, setOrder] = useState<OrderDrawerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState<StaffOption[]>([])

  // Action tabs in drawer: 'details' | 'status' | 'assign' | 'payment'
  const [activeTab, setActiveTab] = useState<'details' | 'status' | 'assign' | 'payment'>('details')

  // Form states: Status update
  const [newStatus, setNewStatus] = useState<string>('')
  const [statusReason, setStatusReason] = useState<string>('')
  const [truckCapacity, setTruckCapacity] = useState<string>('TWO_TONNES')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Form states: Staff assign
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [assigningStaff, setAssigningStaff] = useState(false)

  // Form states: Record payment
  const [paymentMethod, setPaymentMethod] = useState<'MTN_MOMO' | 'AIRTEL_MONEY' | 'CASH' | 'BANK_TRANSFER'>('MTN_MOMO')
  const [paymentAmount, setPaymentAmount] = useState<number>(10000)
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  useEffect(() => {
    if (initialAction === 'payment') {
      setActiveTab('payment')
    } else if (initialAction === 'status') {
      setActiveTab('status')
    } else {
      setActiveTab('details')
    }
  }, [initialAction, orderId])

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const [orderRes, staffRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch('/api/admin/users'),
      ])
      const [orderData, staffData] = await Promise.all([orderRes.json(), staffRes.json()])

      if (orderRes.ok && orderData.data) {
        setOrder(orderData.data)
        setNewStatus(orderData.data.status)
        setSelectedStaffId(orderData.data.assignedTo?.id || '')
        if (orderData.data.amountDue) {
          const due = Number(orderData.data.amountDue)
          const paid = Number(orderData.data.amountPaid || 0)
          setPaymentAmount(Math.max(0, due - paid))
        }
      }
      if (staffRes.ok && staffData.data) {
        setStaffList(staffData.data)
      }
    } catch {
      toast.error(tCommon('retry'))
    } finally {
      setLoading(false)
    }
  }, [orderId, tCommon])

  useEffect(() => {
    if (isOpen && orderId) {
      void fetchOrderDetails()
    } else {
      setOrder(null)
    }
  }, [isOpen, orderId, fetchOrderDetails])

  // Handle status update
  async function handleStatusSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason || undefined,
          truckCapacity: newStatus === 'OUT_FOR_DELIVERY' ? truckCapacity : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      toast.success(t('updateStatus'))
      setStatusReason('')
      onOrderUpdated()
      await fetchOrderDetails()
      setActiveTab('details')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error updating status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Handle staff assignment
  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setAssigningStaff(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: order.status,
          assignedToId: selectedStaffId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign staff')
      toast.success(t('assignStaff'))
      onOrderUpdated()
      await fetchOrderDetails()
      setActiveTab('details')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error assigning staff')
    } finally {
      setAssigningStaff(false)
    }
  }

  // Handle payment submission
  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    setRecordingPayment(true)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          method: paymentMethod,
          amountPaid: Number(paymentAmount),
          reference: paymentReference || undefined,
          note: paymentNote || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || tPayment('error'))
      toast.success(tPayment('success'))
      setPaymentReference('')
      setPaymentNote('')
      onOrderUpdated()
      await fetchOrderDetails()
      setActiveTab('details')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tPayment('error'))
    } finally {
      setRecordingPayment(false)
    }
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
          hour: '2-digit',
          minute: '2-digit',
        }).format(d)
      } catch {
        return String(dateString)
      }
    },
    [locale]
  )

  const formatRwf = useCallback(
    (amount?: number | null) => {
      if (amount === undefined || amount === null) return '0 RWF'
      try {
        const loc = locale === 'rw' ? 'rw-RW' : locale === 'fr' ? 'fr-FR' : locale === 'sw' ? 'sw-KE' : 'en-US'
        return `${new Intl.NumberFormat(loc).format(amount)} RWF`
      } catch {
        return `${amount} RWF`
      }
    },
    [locale]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative w-full sm:w-[500px] bg-white h-full shadow-2xl flex flex-col z-10 border-l border-gray-200 animate-slide-up sm:animate-none">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold font-mono text-navy-900 tracking-tight">
                {order ? order.orderNumber : t('orderDetails')}
              </h2>
              {order && (
                <div className="flex items-center gap-1.5">
                  <OrderStatusPill status={order.status} />
                  <PaymentStatusPill status={order.paymentStatus} />
                </div>
              )}
            </div>
            {order?.client && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {order.client.name} · {order.client.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-navy-900 rounded-lg hover:bg-gray-100 transition shrink-0"
            aria-label={tCommon('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tabs Bar */}
        <div className="flex border-b border-gray-100 px-4 bg-gray-50/70 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-3.5 py-2.5 text-xs font-semibold border-b-2 transition -mb-px',
              activeTab === 'details'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t('orderDetails')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={cn(
              'px-3.5 py-2.5 text-xs font-semibold border-b-2 transition -mb-px',
              activeTab === 'status'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t('updateStatus')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className={cn(
              'px-3.5 py-2.5 text-xs font-semibold border-b-2 transition -mb-px',
              activeTab === 'assign'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t('assignStaff')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={cn(
              'px-3.5 py-2.5 text-xs font-semibold border-b-2 transition -mb-px',
              activeTab === 'payment'
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t('recordPayment')}
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : !order ? (
            <div className="py-12 text-center text-sm text-gray-500">{tCommon('noResults')}</div>
          ) : (
            <>
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-5">
                  {/* Secondary Details Card */}
                  <Card className="p-4 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      {t('orderDetails')}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-gray-500">{t('column_purchase')}</span>
                        <span className="font-mono font-semibold text-navy-900">{order.purchaseCode}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500">TIN</span>
                        <span className="font-medium text-navy-900">
                          {order.tinNumber ? order.tinNumber : t('tinNotProvided')}
                        </span>
                      </div>
                      <div>
                        <span className="block text-gray-500">{t('orderedAt')}</span>
                        <span className="text-gray-800">{formatLocaleDate(order.createdAt)}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500">{t('assignStaff')}</span>
                        <span className="font-medium text-navy-900">
                          {order.assignedTo?.name || t('noStaffAssigned')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 text-xs space-y-2">
                      <div>
                        <span className="block text-gray-500 mb-0.5">{t('deliveryLocation')}</span>
                        <p className="flex items-start gap-1.5 text-gray-800">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>{order.deliveryAddress}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatLocaleDate(order.preferredDate)}</span>
                        </span>
                        {order.preferredTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{order.preferredTime}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {order.notes && (
                      <div className="pt-2 border-t border-gray-100 text-xs">
                        <span className="block text-gray-500 mb-0.5">{t('customerNotes')}</span>
                        <p className="text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-200/60">
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Items Card */}
                  <Card className="p-4 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {t('column_items')}
                    </h3>
                    <div className="divide-y divide-gray-100">
                      {order.items.map((item) => {
                        const productName = tProducts.has(item.product)
                          ? tProducts(item.product)
                          : item.product.replace(/_/g, ' ')
                        return (
                          <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-navy-900">{productName}</p>
                              <p className="text-gray-500">{item.quantity} × {formatRwf(item.unitPrice)}</p>
                            </div>
                            <span className="font-bold text-navy-900">{formatRwf(item.totalPrice)}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                      <span className="font-bold text-navy-900">{t('total')}</span>
                      <span className="font-bold text-orange-600">
                        {formatRwf(order.amountDue ?? order.items.reduce((s, i) => s + i.totalPrice, 0))}
                      </span>
                    </div>
                  </Card>

                  {/* Status History Card */}
                  <Card className="p-4 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {t('statusHistory')}
                    </h3>
                    {order.statusHistory && order.statusHistory.length > 0 ? (
                      <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
                        {order.statusHistory.map((sh) => (
                          <div key={sh.id} className="relative text-xs">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-navy-900 ring-4 ring-white" />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-navy-900">{sh.newStatus}</span>
                              <span className="text-gray-400 text-[10px]">({formatLocaleDate(sh.createdAt)})</span>
                            </div>
                            {sh.user?.name && (
                              <p className="text-gray-500 mt-0.5">by {sh.user.name}</p>
                            )}
                            {sh.reason && (
                              <p className="text-gray-600 mt-1 italic bg-gray-50 p-1.5 rounded border border-gray-100">
                                {sh.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 py-2">{t('noStatusHistory')}</p>
                    )}
                  </Card>
                </div>
              )}

              {/* TAB 2: UPDATE STATUS */}
              {activeTab === 'status' && (
                <form onSubmit={handleStatusSubmit} className="space-y-4">
                  <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {t('column_status')}
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-navy-500 font-medium text-navy-900"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    {newStatus === 'OUT_FOR_DELIVERY' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Truck Capacity
                        </label>
                        <select
                          value={truckCapacity}
                          onChange={(e) => setTruckCapacity(e.target.value)}
                          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-navy-500"
                        >
                          <option value="TWO_TONNES">2 tonnes</option>
                          <option value="THREE_AND_HALF_TONNES">3.5 tonnes</option>
                          <option value="FOUR_AND_HALF_TONNES">4.5 tonnes</option>
                        </select>
                      </div>
                    )}

                    {newStatus === 'CANCELLED' && (
                      <div>
                        <label className="block text-xs font-semibold text-red-700 mb-1.5">
                          Reason for cancellation (Required)
                        </label>
                        <textarea
                          required
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
                          rows={3}
                          placeholder="Please provide a reason..."
                          className="w-full p-3 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                        />
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setActiveTab('details')}
                      >
                        {tCommon('cancel')}
                      </Button>
                      <Button
                        type="submit"
                        loading={updatingStatus}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                      >
                        {t('updateStatus')}
                      </Button>
                    </div>
                  </Card>
                </form>
              )}

              {/* TAB 3: ASSIGN STAFF */}
              {activeTab === 'assign' && (
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {t('selectStaff')}
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-navy-500 font-medium text-navy-900"
                      >
                        <option value="">{t('noStaffAssigned')}</option>
                        {staffList.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name || staff.phone} ({staff.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setActiveTab('details')}
                      >
                        {tCommon('cancel')}
                      </Button>
                      <Button
                        type="submit"
                        loading={assigningStaff}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                      >
                        {t('assignStaff')}
                      </Button>
                    </div>
                  </Card>
                </form>
              )}

              {/* TAB 4: RECORD PAYMENT */}
              {activeTab === 'payment' && (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <Card className="p-5 border border-gray-200/80 rounded-xl bg-white shadow-xs space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {tPayment('method')}
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CASH' | 'BANK_TRANSFER')}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-navy-500"
                      >
                        <option value="MTN_MOMO">{tPayment('MTN_MOMO')}</option>
                        <option value="AIRTEL_MONEY">{tPayment('AIRTEL_MONEY')}</option>
                        <option value="CASH">{tPayment('CASH')}</option>
                        <option value="BANK_TRANSFER">{tPayment('BANK_TRANSFER')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {tPayment('amount')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {tPayment('reference')}
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. MOMO-98234"
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {tPayment('note')}
                      </label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Optional note..."
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setActiveTab('details')}
                      >
                        {tCommon('cancel')}
                      </Button>
                      <Button
                        type="submit"
                        loading={recordingPayment}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                      >
                        {t('recordPayment')}
                      </Button>
                    </div>
                  </Card>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
