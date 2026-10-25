'use client'

import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Package,
  PlusCircle,
  LayoutDashboard,
  Settings,
  LogOut,
  Truck,
  BarChart2,
  Users,
  Layers,
  ClipboardList,
  ChevronDown,
  Search,
  Menu,
  X,
  Globe,
  LucideIcon,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { GearLogo } from '@/components/branding/GearLogo'

interface AppShellProps {
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  tabParam?: string | null
}

interface NavGroup {
  id: string
  title?: string
  items: NavItem[]
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentLocale = useLocale()
  const t = useTranslations('nav')
  const tSettings = useTranslations('settings')
  const role = session?.user?.role

  const [language, setLanguage] = useState(currentLocale)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)

  const currentTab = searchParams.get('tab')

  useEffect(() => {
    const lang = session?.user?.preferredLanguage || localStorage.getItem('jorder_lang') || 'en'
    setLanguage(lang)
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`
    localStorage.setItem('jorder_lang', lang)
  }, [session?.user?.preferredLanguage])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [pathname, currentTab])

  const handleLanguageChange = useCallback(
    async (code: string) => {
      setLanguage(code)
      document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
      localStorage.setItem('jorder_lang', code)
      if (session?.user?.id) {
        await fetch('/api/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredLanguage: code }),
        })
      }
      window.location.reload()
    },
    [session?.user?.id]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const q = encodeURIComponent(searchQuery.trim())
    if (role === 'ADMIN') {
      router.push(`/admin/dashboard?tab=orders&search=${q}`)
    } else if (role === 'ORDER_STAFF' || role === 'TECHNICIAN') {
      router.push(`/staff/dashboard?search=${q}`)
    } else {
      router.push(`/orders?search=${q}`)
    }
  }

  const userInitials = useMemo(() => {
    const name = session?.user?.name?.trim() || ''
    if (!name) return 'U'
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }, [session?.user?.name])

  const firstName = useMemo(() => {
    const name = session?.user?.name?.trim() || ''
    if (!name) return ''
    return name.split(/\s+/)[0]
  }, [session?.user?.name])

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'ADMIN':
        return t('roleAdmin')
      case 'ORDER_STAFF':
        return t('roleOrderStaff')
      case 'TECHNICIAN':
        return t('roleTechnician')
      case 'CLIENT':
      default:
        return t('roleClient')
    }
  }, [role, t])

  const adminGroups: NavGroup[] = useMemo(
    () => [
      {
        id: 'general',
        title: t('general'),
        items: [
          { href: '/admin/dashboard', label: t('dashboard'), icon: LayoutDashboard, tabParam: null },
          { href: '/admin/dashboard?tab=orders', label: t('orders_tab'), icon: ClipboardList, tabParam: 'orders' },
          { href: '/admin/dashboard?tab=consolidation', label: t('consolidation'), icon: Layers, tabParam: 'consolidation' },
          { href: '/admin/dashboard?tab=trucks', label: t('trucks'), icon: Truck, tabParam: 'trucks' },
        ],
      },
      {
        id: 'reports',
        title: t('reports'),
        items: [
          { href: '/admin/dashboard?tab=analytics', label: t('analytics'), icon: BarChart2, tabParam: 'analytics' },
        ],
      },
      {
        id: 'management',
        title: t('management'),
        items: [
          { href: '/admin/dashboard?tab=staff', label: t('staff'), icon: Users, tabParam: 'staff' },
        ],
      },
    ],
    [t]
  )

  const staffGroups: NavGroup[] = useMemo(
    () => [
      {
        id: 'general',
        title: t('general'),
        items: [
          { href: '/staff/dashboard', label: t('dashboard'), icon: LayoutDashboard, tabParam: null },
        ],
      },
    ],
    [t]
  )

  const clientGroups: NavGroup[] = useMemo(
    () => [
      {
        id: 'general',
        title: t('general'),
        items: [
          { href: '/', label: t('home'), icon: Home, tabParam: null },
          { href: '/orders', label: t('orders'), icon: Package, tabParam: null },
          { href: '/order/new', label: t('newOrder'), icon: PlusCircle, tabParam: null },
        ],
      },
    ],
    [t]
  )

  const navGroups = useMemo(() => {
    if (role === 'ADMIN') return adminGroups
    if (role === 'ORDER_STAFF' || role === 'TECHNICIAN') return staffGroups
    return clientGroups
  }, [role, adminGroups, staffGroups, clientGroups])

  const isNavActive = useCallback(
    (item: NavItem) => {
      if (role === 'ADMIN') {
        if (!pathname.startsWith('/admin/dashboard')) {
          return pathname === item.href
        }
        if (item.tabParam === null) {
          return !currentTab || currentTab === 'dashboard' || currentTab === 'overview'
        }
        return currentTab === item.tabParam
      }
      if (item.href === '/') {
        return pathname === '/'
      }
      return pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/')
    },
    [role, pathname, currentTab]
  )

  const homeHref =
    role === 'ADMIN'
      ? '/admin/dashboard'
      : role === 'ORDER_STAFF' || role === 'TECHNICIAN'
      ? '/staff/dashboard'
      : '/'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 1. Desktop and Tablet Left Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden md:flex flex-col bg-white border-r border-gray-200 transition-[width] duration-200',
          'w-16 lg:w-60'
        )}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center px-3.5 lg:px-5 border-b border-gray-100 shrink-0">
          <Link href={homeHref} className="flex items-center gap-2 overflow-hidden" aria-label="J Order home">
            <div className="block lg:hidden">
              <GearLogo showWordmark={false} iconClassName="h-8 w-9" />
            </div>
            <div className="hidden lg:block">
              <GearLogo showWordmark={true} iconClassName="h-8 w-9" wordmarkClassName="text-xl" />
            </div>
          </Link>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {group.title && (
                <h2 className="hidden lg:block px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {group.title}
                </h2>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isNavActive(item)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                        'justify-center lg:justify-start',
                        active
                          ? 'bg-navy-900 text-white font-medium shadow-sm'
                          : 'text-gray-600 hover:text-navy-900 hover:bg-gray-100'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <item.icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-gray-500')} />
                      <span className="hidden lg:inline truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: Settings & Sign Out */}
        <div className="p-2 border-t border-gray-100 space-y-1 shrink-0">
          <Link
            href="/settings"
            title={t('settings')}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
              'justify-center lg:justify-start',
              pathname === '/settings'
                ? 'bg-navy-900 text-white font-medium shadow-sm'
                : 'text-gray-600 hover:text-navy-900 hover:bg-gray-100'
            )}
          >
            <Settings className={cn('w-5 h-5 shrink-0', pathname === '/settings' ? 'text-white' : 'text-gray-500')} />
            <span className="hidden lg:inline truncate">{t('settings')}</span>
          </Link>

          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: '/login' })}
            title={t('signOut')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors',
              'justify-center lg:justify-start'
            )}
          >
            <LogOut className="w-5 h-5 shrink-0 text-gray-500 hover:text-red-600" />
            <span className="hidden lg:inline truncate">{t('signOut')}</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Drawer (< 768px) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl z-10">
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
              <GearLogo showWordmark={true} iconClassName="h-8 w-9" wordmarkClassName="text-xl" />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 text-gray-500 hover:text-navy-900 rounded-lg hover:bg-gray-100"
                aria-label={t('closeMenu')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
              {navGroups.map((group) => (
                <div key={group.id} className="space-y-1">
                  {group.title && (
                    <h2 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {group.title}
                    </h2>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = isNavActive(item)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                            active
                              ? 'bg-navy-900 text-white font-medium shadow-sm'
                              : 'text-gray-600 hover:text-navy-900 hover:bg-gray-100'
                          )}
                          aria-current={active ? 'page' : undefined}
                        >
                          <item.icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-gray-500')} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 space-y-1 shrink-0">
              <Link
                href="/settings"
                onClick={() => setMobileDrawerOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                  pathname === '/settings'
                    ? 'bg-navy-900 text-white font-medium shadow-sm'
                    : 'text-gray-600 hover:text-navy-900 hover:bg-gray-100'
                )}
              >
                <Settings className={cn('w-5 h-5 shrink-0', pathname === '/settings' ? 'text-white' : 'text-gray-500')} />
                <span>{t('settings')}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  void signOut({ callbackUrl: '/login' })
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5 shrink-0 text-gray-500 hover:text-red-600" />
                <span>{t('signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Content Area with Top Bar */}
      <div className="flex-1 min-w-0 md:pl-16 lg:pl-60 flex flex-col">
        {/* Top bar inside the content area */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
            {/* Left: Mobile hamburger & Greeting */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-navy-900 hover:bg-gray-100 -ml-1 shrink-0"
                aria-label={t('menu')}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-navy-900 leading-tight truncate">
                  {pathname === '/settings'
                    ? tSettings('title')
                    : t('greeting', { name: firstName || session?.user?.name || 'User' })}
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block truncate">
                  {pathname === '/settings'
                    ? tSettings('subtitle')
                    : t('greetingSubtitle')}
                </p>
              </div>
            </div>

            {/* Middle: Search field */}
            <div className="flex-1 max-w-xs md:max-w-sm hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="h-10 w-full pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-navy-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors"
                />
              </form>
            </div>

            {/* Right: Language switcher & User menu */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="relative">
                <label className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-900 hover:border-gray-300 cursor-pointer shadow-xs min-h-[36px]">
                  <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden="true" />
                  <span className="uppercase">{language}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
                  <select
                    value={language}
                    onChange={(e) => { void handleLanguageChange(e.target.value) }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    aria-label={t('lang')}
                  >
                    <option value="en">English (EN)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="rw">Kinyarwanda (RW)</option>
                    <option value="sw">Kiswahili (SW)</option>
                  </select>
                </label>
              </div>

              {session && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200 min-h-[44px]"
                    aria-label="User menu"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-900 font-semibold flex items-center justify-center text-xs shrink-0 ring-1 ring-navy-200">
                      {userInitials}
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                      <span className="text-sm font-semibold text-navy-900 leading-tight truncate max-w-[130px]">
                        {session.user.name || 'User'}
                      </span>
                      <span className="text-[11px] text-gray-500 font-normal leading-tight">
                        {roleLabel}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block shrink-0" aria-hidden="true" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 lg:hidden">
                        <p className="text-sm font-semibold text-navy-900">{session.user.name}</p>
                        <p className="text-xs text-gray-500">{roleLabel}</p>
                      </div>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-navy-900"
                      >
                        <Settings className="w-4 h-4 text-gray-500" aria-hidden="true" />
                        {t('settings')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false)
                          void signOut({ callbackUrl: '/login' })
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 text-red-500" aria-hidden="true" />
                        {t('signOut')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
