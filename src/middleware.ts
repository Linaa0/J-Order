import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    if (token) {
      if (token.mustChangePassword && pathname !== '/settings') {
        const url = req.nextUrl.clone()
        url.pathname = '/settings'
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
        const url = req.nextUrl.clone()
        url.pathname = token.role === 'ORDER_STAFF' || token.role === 'TECHNICIAN' ? '/staff/dashboard' : '/'
        return NextResponse.redirect(url)
      }

      if (
        pathname.startsWith('/staff') &&
        token.role !== 'ORDER_STAFF' &&
        token.role !== 'TECHNICIAN' &&
        token.role !== 'ADMIN'
      ) {
        const url = req.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => token != null,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const isGuestCheckout = pathname === '/order/new' && req.nextUrl.searchParams.get('guest') === '1'
  const isOrdersList = pathname === '/orders'
  const isOrderNew = pathname === '/order/new' && !isGuestCheckout
  const isAdminOrStaffOrSettings =
    pathname.startsWith('/admin') || pathname.startsWith('/staff') || pathname.startsWith('/settings')

  if (!isOrdersList && !isOrderNew && !isAdminOrStaffOrSettings) {
    return NextResponse.next()
  }

  return (authMiddleware as (req: NextRequest) => Response)(req)
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/orders/:path*', '/order/:path*', '/settings/:path*'],
}
