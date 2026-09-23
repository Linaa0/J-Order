'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OrderCard } from '@/components/orders/OrderCard'
import { OrderCardSkeleton } from '@/components/ui/Skeleton'
import type { OrderWithDetails } from '@/types'

export default function OrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">My Orders</h1>
        <Button size="sm" onClick={() => router.push('/order/new')}>
          <Plus size={16} />
          New Order
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Package size={48} className="mx-auto text-navy-200 mb-4" />
          <h2 className="font-display text-xl font-semibold text-navy-700 mb-2">No orders yet</h2>
          <p className="text-navy-400 mb-6">Place your first gas order to get started</p>
          <Button onClick={() => router.push('/order/new')}>
            Place First Order
          </Button>
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
