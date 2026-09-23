'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, CheckCircle2, XCircle, Users, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { OrderCardSkeleton } from '@/components/ui/Skeleton'
import { PRODUCT_LABELS } from '@/lib/order-utils'
import { toast } from 'sonner'

interface Analytics {
  totalOrders: number
  ordersToday: number
  completedOrders: number
  cancelledOrders: number
  completionRate: number
  productCounts: Array<{ product: string; _sum: { quantity: number | null } }>
  dailyOrders: Array<{ date: string; count: string }>
}

interface StaffUser {
  id: string
  phone: string
  name: string | null
  role: string
  isActive: boolean
  createdAt: string
  staffCategories: Array<{ category: string }>
  _count: { assignedOrders: number }
}

export default function AdminDashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({ phone: '', name: '', role: 'ORDER_STAFF', categories: [] as string[] })
  const [addingStaff, setAddingStaff] = useState(false)
  const [activeTab, setActiveTab] = useState<'analytics' | 'staff'>('analytics')

  useEffect(() => {
    if (session && session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    Promise.all([
      fetch('/api/admin/analytics').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
    ]).then(([a, s]) => {
      setAnalytics(a.data)
      setStaff(s.data ?? [])
    }).finally(() => setLoading(false))
  }, [session])

  async function toggleStaffActive(userId: string, isActive: boolean) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    if (res.ok) {
      setStaff((prev) => prev.map((s) => s.id === userId ? { ...s, isActive: !isActive } : s))
      toast.success(`Staff ${!isActive ? 'activated' : 'deactivated'}`)
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    setAddingStaff(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to add staff')
        return
      }
      toast.success('Staff member added')
      setStaff((prev) => [...prev, data.data])
      setShowAddStaff(false)
      setNewStaff({ phone: '', name: '', role: 'ORDER_STAFF', categories: [] })
    } finally {
      setAddingStaff(false)
    }
  }

  const ALL_CATEGORIES = ['GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG']

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    ORDER_STAFF: 'Order Staff',
    TECHNICIAN: 'Technician',
  }

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Admin Dashboard</h1>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'analytics' ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'staff' ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'}`}
        >
          Staff Accounts
        </button>
      </div>

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Orders', value: analytics.totalOrders, icon: Package, color: 'text-navy-700' },
              { label: 'Orders Today', value: analytics.ordersToday, icon: TrendingUp, color: 'text-ember-700' },
              { label: 'Completed', value: analytics.completedOrders, icon: CheckCircle2, color: 'text-green-700' },
              { label: 'Cancelled', value: analytics.cancelledOrders, icon: XCircle, color: 'text-red-600' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <stat.icon size={20} className={`${stat.color} mb-2`} />
                  <p className="font-display text-2xl font-bold text-navy-900">{stat.value}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{stat.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-navy-800">Completion Rate</h2>
              <span className="font-bold text-2xl text-ember-700">{analytics.completionRate}%</span>
            </div>
            <div className="h-2 bg-navy-100 rounded-full">
              <motion.div
                className="h-2 bg-ember-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${analytics.completionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </Card>

          {analytics.dailyOrders.length > 0 && (
            <Card>
              <h2 className="font-display font-semibold text-navy-800 mb-4">Orders (Last 30 Days)</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={analytics.dailyOrders.map((d) => ({ date: d.date, orders: parseInt(d.count) }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e0e4f0', fontSize: 12 }}
                    formatter={(v: number) => [`${v} orders`, '']}
                  />
                  <Bar dataKey="orders" fill="#ffa000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card>
            <h2 className="font-display font-semibold text-navy-800 mb-3">Top Products</h2>
            <div className="space-y-2">
              {analytics.productCounts.map((pc) => (
                <div key={pc.product} className="flex items-center justify-between text-sm">
                  <span className="text-navy-700">{PRODUCT_LABELS[pc.product as keyof typeof PRODUCT_LABELS] ?? pc.product}</span>
                  <span className="font-semibold text-navy-900">{pc._sum.quantity ?? 0} units</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddStaff(true)}>
              <Plus size={16} />
              Add Staff
            </Button>
          </div>

          <div className="space-y-3">
            {staff.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy-900">{s.name ?? 'Unnamed'}</p>
                    <p className="text-sm text-navy-500">{s.phone}</p>
                    <p className="text-xs text-navy-400">{ROLE_LABELS[s.role] ?? s.role}</p>
                    {s.staffCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.staffCategories.map((c) => (
                          <span key={c.category} className="text-xs bg-navy-50 text-navy-600 rounded-lg px-2 py-0.5">
                            {PRODUCT_LABELS[c.category as keyof typeof PRODUCT_LABELS]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleStaffActive(s.id, s.isActive)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                      s.isActive
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {s.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showAddStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <h3 className="font-display text-lg font-bold text-navy-900 mb-4">Add Staff Member</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <input
                type="tel"
                placeholder="Phone number"
                required
                value={newStaff.phone}
                onChange={(e) => setNewStaff((p) => ({ ...p, phone: e.target.value }))}
                className="h-12 w-full rounded-xl border-2 border-navy-200 px-4 text-navy-900 focus:outline-none focus:border-ember-700"
              />
              <input
                type="text"
                placeholder="Full name"
                required
                value={newStaff.name}
                onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
                className="h-12 w-full rounded-xl border-2 border-navy-200 px-4 text-navy-900 focus:outline-none focus:border-ember-700"
              />
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))}
                className="h-12 w-full rounded-xl border-2 border-navy-200 px-4 text-navy-900 focus:outline-none focus:border-ember-700 bg-white"
              >
                <option value="ORDER_STAFF">Order Staff</option>
                <option value="TECHNICIAN">Technician</option>
              </select>
              {newStaff.role === 'ORDER_STAFF' && (
                <div>
                  <p className="text-sm font-medium text-navy-800 mb-2">Assigned Products</p>
                  <div className="space-y-1">
                    {ALL_CATEGORIES.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 text-sm text-navy-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newStaff.categories.includes(cat)}
                          onChange={(e) => {
                            setNewStaff((p) => ({
                              ...p,
                              categories: e.target.checked
                                ? [...p.categories, cat]
                                : p.categories.filter((c) => c !== cat),
                            }))
                          }}
                          className="rounded"
                        />
                        {PRODUCT_LABELS[cat as keyof typeof PRODUCT_LABELS]}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddStaff(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={addingStaff}>
                  Add Staff
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
