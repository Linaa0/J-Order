'use client'
import { useCallback, useEffect, useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Package, PlusCircle, LayoutDashboard, Settings, LogOut,
  Truck, BarChart2, Users, Layers, ClipboardList, ChevronDown,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { GearLogo } from '@/components/branding/GearLogo'
import { motion } from 'framer-motion'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const role = session?.user?.role
  const [language, setLanguage] = useState('en')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const lang = session?.user?.preferredLanguage || localStorage.getItem('jorder_lang') || 'en'
    setLanguage(lang)
    // Sync cookie with user preference or localStorage
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

  const handleLanguageChange = useCallback(async (code: string) => {
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
    // Full page reload to pick up new locale from cookie
    window.location.reload()
  }, [session?.user?.id])

  const clientNav = [
    { href: '/', icon: Home, label: t('home') },
    { href: '/orders', icon: Package, label: t('orders') },
    { href: '/order/new', icon: PlusCircle, label: t('newOrder') },
    { href: '/settings', icon: Settings, label: t('settings') },
  ]

  const staffNav = [
    { href: '/staff/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/settings', icon: Settings, label: t('settings') },
  ]

  const adminNav = [
    { href: '/admin/dashboard', icon: ClipboardList, label: t('orders_tab'), tabParam: null },
    { href: '/admin/dashboard?tab=consolidation', icon: Layers, label: t('consolidation'), tabParam: 'consolidation' },
    { href: '/admin/dashboard?tab=trucks', icon: Truck, label: t('trucks'), tabParam: 'trucks' },
    { href: '/admin/dashboard?tab=analytics', icon: BarChart2, label: t('analytics'), tabParam: 'analytics' },
    { href: '/admin/dashboard?tab=staff', icon: Users, label: t('staff'), tabParam: 'staff' },
  ]

  const navItems =
    role === 'ADMIN'
      ? adminNav
      : role === 'ORDER_STAFF' || role === 'TECHNICIAN'
        ? staffNav
        : clientNav

  function isNavActive(item: { href: string; tabParam?: string | null }) {
    if (role !== 'ADMIN') {
      return pathname === item.href ||
        (pathname.startsWith(item.href + '/') && item.href !== '/')
    }
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const currentTab = new URLSearchParams(search).get('tab')
    if (item.tabParam === null) return pathname === '/admin/dashboard' && !currentTab
    return currentTab === item.tabParam
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-navy">
        <div className="mx-auto max-w-screen-xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="J Order home">
            <GearLogo dark iconClassName="h-8 w-11" wordmarkClassName="text-xl" />
          </Link>
          <div className="flex items-center gap-3">
            <label className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/5 px-2 py-1 text-xs text-white sm:flex" aria-label={t('lang')}>
              <span>{t('lang')}</span>
              <select
                value={language}
                onChange={(e) => { void handleLanguageChange(e.target.value) }}
                className="bg-transparent text-white outline-none cursor-pointer"
              >
                <option value="en" className="text-navy-900">English</option>
                <option value="rw" className="text-navy-900">Kinyarwanda</option>
                <option value="fr" className="text-navy-900">Français</option>
                <option value="sw" className="text-navy-900">Kiswahili</option>
              </select>
            </label>
            {session && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white transition hover:bg-white/10 min-h-[44px] sm:min-h-0"
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                >
                  <span className="hidden sm:inline truncate max-w-[100px]">{session.user.name}</span>
                  <ChevronDown size={14} className="shrink-0" aria-hidden="true" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-gray-50"
                    >
                      <Settings size={16} aria-hidden="true" />
                      {t('settings')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        void signOut({ callbackUrl: '/login' })
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      {t('signOut')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1100px] px-4 sm:px-6 py-6">
        {children}
      </main>

      <nav className="sticky bottom-0 z-40 bg-white border-t border-navy-100 shadow-navy" aria-label="Main navigation">
        <div className="mx-auto max-w-screen-xl px-1">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const active = isNavActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 text-xs font-medium transition-colors min-h-[44px]',
                    active ? 'text-ember-700' : 'text-navy-400 hover:text-navy-700'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute top-0 inset-x-2 h-0.5 bg-ember-gradient rounded-full"
                    />
                  )}
                  <item.icon size={19} strokeWidth={active ? 2.5 : 1.5} aria-hidden="true" />
                  <span className="truncate w-full text-center leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
