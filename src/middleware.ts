import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

const protectedPaths = ['/admin', '/staff', '/orders', '/order', '/settings']

const authMiddleware = withAuth(
  function onSuccess(_req) {
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
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isGuestCheckout || !isProtectedPath) {
    return NextResponse.next()
  }

  return (authMiddleware as (req: NextRequest) => Response)(req)
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/orders/:path*', '/order/:path*', '/settings/:path*'],
}
