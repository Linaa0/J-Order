'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, PlusCircle, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GearLogo } from '@/components/branding/GearLogo'
import { motion } from 'framer-motion'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    const nextLanguage = session?.user?.preferredLanguage || localStorage.getItem('jorder_lang') || 'en'
    setLanguage(nextLanguage)
    document.cookie = `NEXT_LOCALE=${nextLanguage}; path=/; max-age=31536000`
    localStorage.setItem('jorder_lang', nextLanguage)
  }, [session?.user?.preferredLanguage])

  async function handleLanguageChange(code: string) {
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
  }

  const clientNav = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/orders', icon: Package, label: 'My Orders' },
    { href: '/order/new', icon: PlusCircle, label: 'New Order' },
  ]

  const staffNav = [
    { href: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  const adminNav = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  const navItems =
    role === 'ADMIN'
      ? adminNav
      : role === 'ORDER_STAFF' || role === 'TECHNICIAN'
        ? staffNav
        : clientNav

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-navy">
        <div className="mx-auto max-w-screen-xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="J Order home">
            <GearLogo dark iconClassName="h-8 w-11" wordmarkClassName="text-xl" />
          </Link>
          <div className="flex items-center gap-3">
            {session?.user?.name && (
              <span className="text-sm text-navy-300 hidden sm:block">
                {session.user.name}
              </span>
            )}
            <label className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/5 px-2 py-1 text-xs text-white sm:flex">
              <span>Lang</span>
              <select
                aria-label="Language selector"
                value={language}
                onChange={(event) => { void handleLanguageChange(event.target.value) }}
                className="bg-transparent text-white outline-none"
              >
                <option value="en" className="text-navy-900">English</option>
                <option value="rw" className="text-navy-900">Kinyarwanda</option>
                <option value="fr" className="text-navy-900">Français</option>
                <option value="sw" className="text-navy-900">Kiswahili</option>
              </select>
            </label>
            {session && (
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2 py-1 text-xs text-white transition hover:bg-white/10"
                aria-label="Log out"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-6">
        {children}
      </main>

      <nav className="sticky bottom-0 z-40 bg-white border-t border-navy-100 shadow-navy">
        <div className="mx-auto max-w-screen-xl px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium transition-colors',
                    isActive ? 'text-ember-700' : 'text-navy-400 hover:text-navy-700'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute top-0 h-0.5 w-8 bg-ember-gradient rounded-full"
                    />
                  )}
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
