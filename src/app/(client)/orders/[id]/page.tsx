'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLivePolling } from '@/hooks/useLivePolling'
import { MapPin, Calendar, Printer, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge, PaymentBadge } from '@/components/ui/Badge'
import { PRODUCT_LABELS, ORDER_STATUS_LABELS } from '@/lib/order-utils'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'

const STATUS_STEPS = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('tracking')
  const tOrder = useTranslations('order')
  const tCommon = useTranslations('common')
  const tPayment = useTranslations('payment')
  const tp = useTranslations('products')
  const tStatus = useTranslations('status')
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const isTerminal = order ? ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status) : false

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`)
      if (res.ok) {
        const d = await res.json()
        if (d.data) setOrder(d.data)
      }
    } catch {
      // Handled cleanly
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrder()
  }, [id])

  useLivePolling(fetchOrder, {
    intervalMs: 15000,
    enabled: Boolean(order && !isTerminal),
  })

  if (loading && !order) return <div className="py-16 text-center text-gray-500">{tCommon('loading')}</div>
  if (!order) return <div className="py-16 text-center text-gray-500">{tOrder('notFound')}</div>

  const currentStepIndex = STATUS_STEPS.findIndex((step) => step.key === order.status)
  const progress = Math.max(0, (currentStepIndex + 1) / STATUS_STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-navy-900">{t('title')}</h1>

        <Card className="p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder={t('orderNumberPlaceholder')}
              className="flex-1 h-11 px-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
            />
            <Button className="h-11 px-6">{t('trackButton')}</Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">{tOrder('orderNumber')}</p>
              <p className="font-mono text-lg font-semibold text-navy-900">{order.orderNumber}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-500 mt-3">{t('placedOn')} {formatDate(order.createdAt)}</p>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" className="h-9">
              <Printer size={16} className="mr-2" />
              {t('print')}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-navy-900 mb-4">{t('deliveryProgress')}</h2>
          <div className="relative">
            <div className="h-1 bg-gray-200 rounded-full">
              <div className="h-1 bg-orange-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-4">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex
                const isCurrent = index === currentStepIndex
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCompleted ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className={`text-xs mt-2 text-center ${isCurrent ? 'font-medium text-navy-900' : 'text-gray-500'}`}>
                      {t(step.key)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">{t('estimatedDelivery')} {formatDate(order.preferredDate)}</p>
        </Card>

        {order.statusHistory.length > 0 && (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-navy-900 mb-4">{t('timeline')}</h2>
            <div className="space-y-4">
              {order.statusHistory.slice().reverse().map((h, index) => {
                const isLatest = index === 0
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${isLatest ? 'bg-orange-600' : 'bg-gray-300'}`} />
                      {index < order.statusHistory.length - 1 && <div className="w-px h-full bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`text-sm font-medium ${isLatest ? 'text-navy-900' : 'text-gray-600'}`}>
                        {tStatus.has(h.newStatus) ? tStatus(h.newStatus) : (ORDER_STATUS_LABELS[h.newStatus] ?? h.newStatus)}
                      </p>
                      {h.reason && <p className="text-sm text-gray-500 mt-1">{h.reason}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(h.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {(order.assignedTo || order.truckCapacity) && (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-navy-900 mb-4">{t('deliveryInfo')}</h2>
            <div className="space-y-3">
              {order.assignedTo && (
                <div>
                  <p className="text-sm text-gray-500">{t('assignedStaff')}</p>
                  <p className="text-sm font-medium text-navy-900">{order.assignedTo.name}</p>
                  {order.assignedTo.phone && <p className="text-sm text-gray-600">{order.assignedTo.phone}</p>}
                </div>
              )}
              {order.truckCapacity && (
                <div>
                  <p className="text-sm text-gray-500">{t('truckCapacity')}</p>
                  <p className="text-sm font-medium text-navy-900">{order.truckCapacity.replace(/_/g, ' ')}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">{t('estimatedDelivery')}</p>
                <p className="text-sm font-medium text-navy-900">{formatDate(order.preferredDate)} · {order.preferredTime}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-base font-semibold text-navy-900 mb-4">{tOrder('product')}</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-navy-900">
                    {tp.has(item.product) ? tp(item.product as Parameters<typeof tp>[0]) : PRODUCT_LABELS[item.product]}
                  </p>
                  <p className="text-sm text-gray-500">{tOrder('quantity')}: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-navy-900">
                  {item.unitPrice ? new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(item.unitPrice * item.quantity) : '-'}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-navy-900 mb-3">{tOrder('location')}</h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700">{formatDate(order.preferredDate)} · {order.preferredTime}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-navy-900 mb-3">{tPayment('method')}</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">{tPayment('status')}</p>
                <PaymentBadge status={order.paymentStatus} />
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">{t('amountDue')}</p>
                <p className="text-sm font-medium text-navy-900">
                  {order.amountDue != null ? new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(order.amountDue) : '-'}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">{t('amountPaid')}</p>
                <p className="text-sm font-medium text-navy-900">
                  {new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(order.amountPaid)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-navy-900 mb-3">{t('needHelp')}</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-gray-600">{t('contactSupport')}</p>
              <p className="text-sm font-medium text-navy-900 mt-1">+250 788 123 456</p>
            </div>
            <Button size="sm" className="h-9">
              <Phone size={16} className="mr-2" />
              {t('contact')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
