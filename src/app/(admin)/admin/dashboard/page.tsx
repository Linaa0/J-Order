'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, CheckCircle2, XCircle, Plus, RefreshCw, Truck, User, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
      toast.success(t('addTruck'))
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
    <div className="space-y-6">
      {/* Tab Navigation & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => router.push(tab.key === 'overview' ? '/admin/dashboard' : `/admin/dashboard?tab=${tab.key}`)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all border ${
                  isActive
                    ? 'bg-navy-900 text-white border-navy-900 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200/80 hover:bg-gray-50 hover:text-navy-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchDashboardData()}
          aria-label={tCommon('refresh')}
          className="self-end sm:self-auto border-gray-200/80 text-gray-700 hover:text-navy-900 hover:bg-gray-50 gap-1.5"
        >
          <RefreshCw size={14} />
          <span className="text-xs font-semibold">{tCommon('refresh')}</span>
        </Button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <DashboardOverview
          onNavigateTab={(tab) =>
            router.push(tab === 'overview' ? '/admin/dashboard' : `/admin/dashboard?tab=${tab}`)
          }
        />
      )}

      {activeTab === 'orders' && <AdminOrdersPanel />}
      {activeTab === 'consolidation' && <ConsolidationPanel />}

      {/* Trucks Tab */}
      {activeTab === 'trucks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy-900">{t('truckFleet')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{trucks.length} {t('trucks').toLowerCase()}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddTruck(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs gap-1.5"
            >
              <Plus size={16} />
              {t('addTruck')}
            </Button>
          </div>

          {trucks.length === 0 ? (
            <div className="rounded-xl border border-gray-200/80 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto h-12 w-12 rounded-full bg-navy-50 flex items-center justify-center text-navy-900 mb-3">
                <Truck size={24} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold text-navy-900">{t('noTrucks')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trucks.map((truck) => {
                const statusConfig = {
                  AVAILABLE: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200/60', label: t('truckStatusAvailable') },
                  LOADING: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 border-amber-200/60', label: t('truckStatusLoading') },
                  ON_TRIP: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-800 border-blue-200/60', label: t('truckStatusOnTrip') },
                  MAINTENANCE: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-800 border-red-200/60', label: t('truckStatusMaintenance') },
                }[truck.status] ?? { dot: 'bg-gray-400', pill: 'bg-gray-50 text-gray-700 border-gray-200', label: truck.status }

                return (
                  <div
                    key={truck.id}
                    className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center shrink-0">
                            <Truck size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-navy-900 text-sm leading-tight">{truck.name}</p>
                            <p className="font-mono text-xs text-gray-500 mt-0.5">{truck.plateNumber}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusConfig.pill}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t('truckCapacityLabel')}</span>
                        <span className="font-semibold text-navy-900">{t('kgCapacity', { kg: truck.capacityKg })}</span>
                      </div>

                      {truck.notes && (
                        <p className="mt-2.5 text-xs text-gray-500 italic bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          {truck.notes}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        truck.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${truck.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {truck.isActive ? t('statusActive') : t('statusInactive')}
                      </span>

                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/trucks/${truck.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isActive: !truck.isActive }),
                          })
                          setTrucks((prev) => prev.map((t) => t.id === truck.id ? { ...t, isActive: !truck.isActive } : t))
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${
                          truck.isActive
                            ? 'bg-red-50 text-red-700 border-red-200/70 hover:bg-red-100'
                            : 'bg-navy-50 text-navy-800 border-navy-200/70 hover:bg-navy-100'
                        }`}
                      >
                        {truck.isActive ? t('deactivate') : t('activate')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('totalOrders'), value: analytics.totalOrders, icon: Package, iconBg: 'bg-navy-50 text-navy-900' },
              { label: t('ordersToday'), value: analytics.ordersToday, icon: TrendingUp, iconBg: 'bg-orange-50 text-orange-600' },
              { label: t('completed'), value: analytics.completedOrders, icon: CheckCircle2, iconBg: 'bg-emerald-50 text-emerald-700' },
              { label: t('cancelled'), value: analytics.cancelledOrders, icon: XCircle, iconBg: 'bg-red-50 text-red-700' },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                      <stat.icon size={20} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-navy-900 tracking-tight">{stat.value}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Completion Rate Card */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-navy-900">{t('completionRate')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('completed')}</p>
              </div>
              <span className="text-2xl font-bold text-orange-600">{analytics.completionRate}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={analytics.completionRate} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                className="h-full bg-orange-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${analytics.completionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Daily Orders Bar Chart */}
          {analytics.dailyOrders.length > 0 && (
            <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-navy-900 mb-4">{t('ordersLast30')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.dailyOrders.map((d) => ({ date: d.date, orders: parseInt(d.count) }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    formatter={(v: number) => [t('ordersCount', { count: v }), '']}
                  />
                  <Bar dataKey="orders" fill="#060d40" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Products */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-navy-900 mb-4">{t('topProducts')}</h3>
            <div className="space-y-3">
              {analytics.productCounts.map((pc) => (
                <div key={pc.product} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-navy-900 font-medium">{PRODUCT_LABELS[pc.product as keyof typeof PRODUCT_LABELS] ?? pc.product}</span>
                  <span className="bg-navy-50 text-navy-900 font-semibold px-2.5 py-1 rounded-md text-xs">{pc._sum.quantity ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy-900">{t('staffAccounts')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{staff.length} {t('staffAccounts').toLowerCase()}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddStaff(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs gap-1.5"
            >
              <Plus size={16} />
              {t('addStaff')}
            </Button>
          </div>

          {staff.length === 0 ? (
            <div className="rounded-xl border border-gray-200/80 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto h-12 w-12 rounded-full bg-navy-50 flex items-center justify-center text-navy-900 mb-3">
                <User size={24} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold text-navy-900">{t('noStaff')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map((s) => {
                const roleBadgeClass = {
                  ADMIN: 'bg-purple-50 text-purple-800 border-purple-200/60',
                  ORDER_STAFF: 'bg-blue-50 text-blue-800 border-blue-200/60',
                  TECHNICIAN: 'bg-teal-50 text-teal-800 border-teal-200/60',
                }[s.role] ?? 'bg-gray-50 text-gray-700 border-gray-200'

                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center shrink-0">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-navy-900 text-sm leading-tight">{s.name ?? t('unnamed')}</p>
                            <p className="flex items-center gap-1 text-xs text-gray-500 font-mono mt-0.5">
                              <Phone size={11} className="text-gray-400" />
                              {s.phone}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${roleBadgeClass}`}>
                          {ROLE_LABELS[s.role as keyof typeof ROLE_LABELS] ?? s.role}
                        </span>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>{t('assignedOrdersCount', { count: s._count.assignedOrders })}</span>
                      </div>

                      {s.staffCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {s.staffCategories.map((c) => (
                            <span key={c.category} className="text-xs bg-navy-50 text-navy-800 border border-navy-100/70 rounded-md px-2 py-0.5 font-medium">
                              {PRODUCT_LABELS[c.category as keyof typeof PRODUCT_LABELS]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {s.isActive ? t('statusActive') : t('statusInactive')}
                      </span>

                      <button
                        type="button"
                        onClick={() => void toggleStaffActive(s.id, s.isActive)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${
                          s.isActive
                            ? 'bg-red-50 text-red-700 border-red-200/70 hover:bg-red-100'
                            : 'bg-navy-50 text-navy-800 border-navy-200/70 hover:bg-navy-100'
                        }`}
                      >
                        {s.isActive ? t('deactivate') : t('activate')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="add-staff-title">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm">
            <h3 id="add-staff-title" className="text-lg font-bold text-navy-900 mb-4">{t('addStaffTitle')}</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">{t('staffPhone')}</label>
                <input
                  type="tel"
                  placeholder="+250 7XX XXX XXX"
                  required
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff((p) => ({ ...p, phone: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">{t('staffName')}</label>
                <input
                  type="text"
                  placeholder={t('staffName')}
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">{t('staffRole')}</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900 bg-white"
                >
                  <option value="ORDER_STAFF">{t('staffRoleOrderStaff')}</option>
                  <option value="TECHNICIAN">{t('staffRoleTechnician')}</option>
                </select>
              </div>

              {newStaff.role === 'ORDER_STAFF' && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('assignedProducts')}</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {ALL_CATEGORIES.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 text-sm text-navy-800 cursor-pointer min-h-[32px]">
                        <input
                          type="checkbox"
                          checked={newStaff.categories.includes(cat)}
                          onChange={(e) => {
                            setNewStaff((p) => ({
                              ...p,
                              categories: e.target.checked
                                ? [...p.categories, cat]
                                : p.categories.filter((c) => c !== cat)
                            }))
                          }}
                          className="rounded text-navy-900 focus:ring-navy-900"
                        />
                        <span>{PRODUCT_LABELS[cat as keyof typeof PRODUCT_LABELS]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddStaff(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold" loading={saving}>
                  {t('addStaff')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Truck Modal */}
      {showAddTruck && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="add-truck-title">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm">
            <h3 id="add-truck-title" className="text-lg font-bold text-navy-900 mb-4">{t('addTruck')}</h3>
            <form onSubmit={handleAddTruck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">{t('truckPlate')}</label>
                <input
                  type="text"
                  placeholder={t('truckPlatePlaceholder')}
                  required
                  value={newTruck.plateNumber}
                  onChange={(e) => setNewTruck((p) => ({ ...p, plateNumber: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">{t('truckName')}</label>
                <input
                  type="text"
                  placeholder={t('truckNamePlaceholder')}
                  required
                  value={newTruck.name}
                  onChange={(e) => setNewTruck((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">{t('truckCapacityLabel')}</label>
                <input
                  type="number"
                  placeholder={t('truckCapacityPlaceholder')}
                  required
                  min="100"
                  value={newTruck.capacityKg}
                  onChange={(e) => setNewTruck((p) => ({ ...p, capacityKg: parseInt(e.target.value) || 2000 }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-navy-900 focus:outline-none focus:border-navy-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddTruck(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold" loading={saving}>
                  {tCommon('save')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

