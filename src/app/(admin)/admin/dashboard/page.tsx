'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, CheckCircle2, XCircle, Plus, RefreshCw, Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { OrderCardSkeleton } from '@/components/ui/Skeleton'
import { PRODUCT_LABELS } from '@/lib/order-utils'
import { toast } from 'sonner'
import { AdminOrdersPanel, ConsolidationPanel } from '@/components/admin/AdminOperations'
import { DashboardOverview } from '@/components/admin/DashboardOverview'

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
  phone: string | null
  name: string | null
  role: string
  isActive: boolean
  createdAt: string
  staffCategories: Array<{ category: string }>
  _count: { assignedOrders: number }
}

interface TruckData {
  id: string
  plateNumber: string
  name: string
  capacityKg: number
  status: string
  isActive: boolean
  notes: string | null
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const activeTab = searchParams.get('tab') ?? 'overview'

  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [trucks, setTrucks] = useState<TruckData[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showAddTruck, setShowAddTruck] = useState(false)
  const [newStaff, setNewStaff] = useState({ phone: '', name: '', role: 'ORDER_STAFF', categories: [] as string[] })
  const [newTruck, setNewTruck] = useState({ plateNumber: '', name: '', capacityKg: 2000, notes: '' })
  const [saving, setSaving] = useState(false)

  const ALL_CATEGORIES = useMemo(() => ['GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG'], [])

  const ROLE_LABELS = useMemo(() => ({
    ADMIN: t('staffAccounts'),
    ORDER_STAFF: t('staffRoleOrderStaff'),
    TECHNICIAN: t('staffRoleTechnician'),
  }), [t])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, staffRes, trucksRes] = await Promise.all([
        fetch('/api/admin/analytics'),
        fetch('/api/admin/users'),
        fetch('/api/admin/trucks'),
      ])
      const [analyticsData, staffData, trucksData] = await Promise.all([
        analyticsRes.json(),
        staffRes.json(),
        trucksRes.json(),
      ])
      setAnalytics(analyticsData.data ?? null)
      setStaff(staffData.data ?? [])
      setTrucks(trucksData.data ?? [])
    } catch {
      toast.error(tCommon('retry'))
    } finally {
      setLoading(false)
    }
  }, [tCommon])

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    void fetchDashboardData()
  }, [status, session, fetchDashboardData, router])

  async function toggleStaffActive(userId: string, isActive: boolean) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    if (res.ok) {
      setStaff((prev) => prev.map((s) => s.id === userId ? { ...s, isActive: !isActive } : s))
      toast.success(!isActive ? t('activate') : t('deactivate'))
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
      toast.success(t('addStaff'))
      setStaff((prev) => [...prev, data.data])
      setShowAddStaff(false)
      setNewStaff({ phone: '', name: '', role: 'ORDER_STAFF', categories: [] })
    } finally { setSaving(false) }
  }

  async function handleAddTruck(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTruck),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
      toast.success(t('trucks'))
      setTrucks((prev) => [...prev, data.data])
      setShowAddTruck(false)
      setNewTruck({ plateNumber: '', name: '', capacityKg: 2000, notes: '' })
    } finally { setSaving(false) }
  }

  if (loading && activeTab !== 'orders' && activeTab !== 'consolidation' && activeTab !== 'overview') {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}</div>
  }

  const tabs = [
    { key: 'overview', label: t('overview') },
    { key: 'orders', label: t('orders') },
    { key: 'consolidation', label: t('consolidation') },
    { key: 'trucks', label: t('trucks') },
    { key: 'analytics', label: t('analytics') },
    { key: 'staff', label: t('staffAccounts') },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">{t('dashboard')}</h1>
        <Button variant="ghost" size="icon" onClick={() => void fetchDashboardData()} aria-label={tCommon('refresh')}>
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => router.push(tab.key === 'overview' ? '/admin/dashboard' : `/admin/dashboard?tab=${tab.key}`)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-navy-900 text-white'
                : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <DashboardOverview
          onNavigateTab={(tab) =>
            router.push(tab === 'overview' ? '/admin/dashboard' : `/admin/dashboard?tab=${tab}`)
          }
        />
      )}

      {activeTab === 'orders' && <AdminOrdersPanel />}
      {activeTab === 'consolidation' && <ConsolidationPanel />}

      {activeTab === 'trucks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddTruck(true)}>
              <Plus size={16} />
              {t('trucks')}
            </Button>
          </div>
          {trucks.length === 0 && (
            <Card>
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <Truck size={36} strokeWidth={1.5} />
                <p className="text-sm">{t('noStaff')}</p>
              </div>
            </Card>
          )}
          <div className="space-y-3">
            {trucks.map((truck) => (
              <Card key={truck.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy-900">{truck.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{truck.plateNumber}</p>
                    <p className="text-xs text-gray-400">{truck.capacityKg} kg capacity</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      truck.status === 'AVAILABLE' ? 'bg-navy-100 text-navy-800' :
                      truck.status === 'ON_TRIP' ? 'bg-navy-100 text-navy-800' :
                      truck.status === 'LOADING' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-50 text-red-700'
                    }`}>{truck.status.replace(/_/g, ' ')}</span>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`/api/admin/trucks/${truck.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive: !truck.isActive }),
                      })
                      setTrucks((prev) => prev.map((t) => t.id === truck.id ? { ...t, isActive: !truck.isActive } : t))
                    }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all min-h-[44px] ${
                      truck.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
                    }`}
                  >
                    {truck.isActive ? t('deactivate') : t('activate')}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('totalOrders'), value: analytics.totalOrders, icon: Package, color: 'text-navy-700' },
              { label: t('ordersToday'), value: analytics.ordersToday, icon: TrendingUp, color: 'text-orange-600' },
              { label: t('completed'), value: analytics.completedOrders, icon: CheckCircle2, color: 'text-navy-900' },
              { label: t('cancelled'), value: analytics.cancelledOrders, icon: XCircle, color: 'text-red-600' },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <stat.icon size={20} className={`${stat.color} mb-2`} aria-hidden="true" />
                  <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-navy-900">{t('completionRate')}</h2>
              <span className="font-bold text-2xl text-orange-600">{analytics.completionRate}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full" role="progressbar" aria-valuenow={analytics.completionRate} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                className="h-2 bg-orange-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${analytics.completionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </Card>
          {analytics.dailyOrders.length > 0 && (
            <Card>
              <h2 className="font-semibold text-navy-900 mb-4">{t('ordersLast30')}</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={analytics.dailyOrders.map((d) => ({ date: d.date, orders: parseInt(d.count) }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v: number) => [`${v} orders`, '']}
                  />
                  <Bar dataKey="orders" fill="#0d1b5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
          <Card>
            <h2 className="font-semibold text-navy-900 mb-3">{t('topProducts')}</h2>
            <div className="space-y-2">
              {analytics.productCounts.map((pc) => (
                <div key={pc.product} className="flex items-center justify-between text-sm">
                  <span className="text-navy-700">{PRODUCT_LABELS[pc.product as keyof typeof PRODUCT_LABELS] ?? pc.product}</span>
                  <span className="font-semibold text-navy-900">{pc._sum.quantity ?? 0}</span>
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
              {t('addStaff')}
            </Button>
          </div>
          {staff.length === 0 && (
            <Card>
              <p className="py-8 text-center text-sm text-gray-500">{t('noStaff')}</p>
            </Card>
          )}
          <div className="space-y-3">
            {staff.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy-900">{s.name ?? t('unnamed')}</p>
                    <p className="text-sm text-gray-500">{s.phone}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[s.role as keyof typeof ROLE_LABELS] ?? s.role}</p>
                    {s.staffCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.staffCategories.map((c) => (
                          <span key={c.category} className="text-xs bg-navy-50 text-navy-700 border border-navy-100 rounded-lg px-2 py-0.5">
                            {PRODUCT_LABELS[c.category as keyof typeof PRODUCT_LABELS]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => void toggleStaffActive(s.id, s.isActive)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all min-h-[44px] ${
                      s.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
                    }`}
                  >
                    {s.isActive ? t('deactivate') : t('activate')}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showAddStaff && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-staff-title">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm">
            <h3 id="add-staff-title" className="text-lg font-bold text-navy-900 mb-4">{t('addStaffTitle')}</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <input type="tel" placeholder={t('staffPhone')} required value={newStaff.phone} onChange={(e) => setNewStaff((p) => ({ ...p, phone: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900" />
              <input type="text" placeholder={t('staffName')} required value={newStaff.name} onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900" />
              <select value={newStaff.role} onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900 bg-white">
                <option value="ORDER_STAFF">{t('staffRoleOrderStaff')}</option>
                <option value="TECHNICIAN">{t('staffRoleTechnician')}</option>
              </select>
              {newStaff.role === 'ORDER_STAFF' && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">{t('assignedProducts')}</p>
                  <div className="space-y-1">
                    {ALL_CATEGORIES.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 text-sm text-navy-800 cursor-pointer min-h-[36px]">
                        <input type="checkbox" checked={newStaff.categories.includes(cat)} onChange={(e) => { setNewStaff((p) => ({ ...p, categories: e.target.checked ? [...p.categories, cat] : p.categories.filter((c) => c !== cat) })) }} className="rounded" />
                        {PRODUCT_LABELS[cat as keyof typeof PRODUCT_LABELS]}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddStaff(false)}>{tCommon('cancel')}</Button>
                <Button type="submit" className="flex-1" loading={saving}>{t('addStaff')}</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showAddTruck && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-truck-title">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm">
            <h3 id="add-truck-title" className="text-lg font-bold text-navy-900 mb-4">{t('trucks')}</h3>
            <form onSubmit={handleAddTruck} className="space-y-4">
              <input type="text" placeholder="Plate number (e.g. RAB 123 A)" required value={newTruck.plateNumber} onChange={(e) => setNewTruck((p) => ({ ...p, plateNumber: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900" />
              <input type="text" placeholder="Truck name" required value={newTruck.name} onChange={(e) => setNewTruck((p) => ({ ...p, name: e.target.value }))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900" />
              <input type="number" placeholder="Capacity in kg" required min="100" value={newTruck.capacityKg} onChange={(e) => setNewTruck((p) => ({ ...p, capacityKg: parseInt(e.target.value) || 2000 }))} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900" />
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddTruck(false)}>{tCommon('cancel')}</Button>
                <Button type="submit" className="flex-1" loading={saving}>{tCommon('save')}</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
