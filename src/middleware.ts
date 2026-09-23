import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

const publicPaths = ['/', '/login', '/verify', '/track']

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

  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/track')

  if (isPublic) {
    return NextResponse.next()
  }

  return (authMiddleware as (req: NextRequest) => Response)(req)
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
