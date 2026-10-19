'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Package, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'
import { useSession } from 'next-auth/react'

export default function ClientHomePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const t = useTranslations('common')
  const tOrder = useTranslations('order')
  const tNav = useTranslations('nav')
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  const activeOrder = orders.find((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
  const recentOrders = orders.filter((o) => o.id !== activeOrder?.id).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">
            {session?.user?.name ? `Hello, ${session.user.name}` : t('welcome')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{tOrder('successMessage')}</p>
        </div>
      </div>

      <Button
        onClick={() => router.push('/order/new')}
        className="w-full sm:w-auto bg-ember-600 hover:bg-ember-700 text-white focus:ring-2 focus:ring-ember-500 focus:ring-offset-2"
        size="lg"
      >
        <Plus size={20} className="mr-2" />
        {tOrder('new')}
      </Button>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('loading')}</div>
      ) : activeOrder ? (
        <>
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-3">{tOrder('trackOrder')}</h2>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{tOrder('orderNumber')}</p>
                  <p className="font-mono text-lg font-semibold text-navy-900">{activeOrder.orderNumber}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={activeOrder.status} />
                    <span className="text-sm text-gray-500">· {formatDate(activeOrder.createdAt)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/orders/${activeOrder.id}`)}
                >
                  {tOrder('viewOrders')}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </Card>
          </div>

          {recentOrders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-navy-900 mb-3">{tNav('orders')}</h2>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium text-navy-900">{order.orderNumber}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      ) : orders.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-navy-900 mb-3">{tNav('orders')}</h2>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium text-navy-900">{order.orderNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={order.status} />
                      <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-navy-900 mb-2">{tOrder('notFound')}</h2>
          <p className="text-sm text-gray-600 mb-4">{tOrder('successMessage')}</p>
          <Button onClick={() => router.push('/order/new')}>
            <Plus size={16} className="mr-2" />
            {tOrder('new')}
          </Button>
        </Card>
      )}
    </div>
  )
}
