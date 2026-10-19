'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Package, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { OrderCard } from '@/components/orders/OrderCard'
import { OrderCardSkeleton } from '@/components/ui/Skeleton'
import type { OrderWithDetails } from '@/types'

export default function OrdersPage() {
  const router = useRouter()
  const t = useTranslations('order')
  const tNav = useTranslations('nav')
  const tCommon = useTranslations('common')
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function fetchOrders() {
    setLoading(true)
    setError(false)
    const controller = new AbortController()
    fetch('/api/orders', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .catch((err) => { if (err.name !== 'AbortError') setError(true) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">{tNav('orders')}</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchOrders} aria-label={tCommon('refresh')}>
            <RefreshCw size={16} aria-hidden="true" />
          </Button>
          <Button size="sm" onClick={() => router.push('/order/new')}>
            <Plus size={16} aria-hidden="true" />
            {t('new')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Package size={48} className="mx-auto text-navy-200 mb-4" aria-hidden="true" />
          <p className="text-navy-400 mb-6">{tCommon('noResults')}</p>
          <Button variant="outline" onClick={fetchOrders}>{tCommon('retry')}</Button>
        </motion.div>
      ) : orders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Package size={48} className="mx-auto text-navy-200 mb-4" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-navy-700 mb-2">{t('notFound')}</h2>
          <p className="text-navy-400 mb-6">{t('successMessage')}</p>
          <Button onClick={() => router.push('/order/new')}>{t('new')}</Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
