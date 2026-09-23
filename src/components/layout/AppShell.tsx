'use client'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, PlusCircle, LayoutDashboard, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FlameIcon } from '@/components/icons/ProductIcons'
import { motion } from 'framer-motion'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role

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
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl">
            <FlameIcon size={28} className="animate-flame-flicker" />
            <span>J Order</span>
          </Link>
          {session?.user?.name && (
            <span className="text-sm text-navy-300 hidden sm:block">
              {session.user.name}
            </span>
          )}
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
