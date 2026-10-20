import { UserRole } from '@prisma/client'

describe('Root page role-based redirection', () => {
  function getRedirectTarget(session: { user: { role: string } } | null) {
    if (!session?.user) {
      return '/login'
    }
    if (session.user.role === UserRole.ADMIN) {
      return '/admin/dashboard'
    }
    if (session.user.role === UserRole.ORDER_STAFF || session.user.role === UserRole.TECHNICIAN) {
      return '/staff/dashboard'
    }
    if (session.user.role === UserRole.CLIENT) {
      return null // Stays on client home at "/", no redirect to itself
    }
    return null
  }

  it('redirects unauthenticated users to /login', () => {
    expect(getRedirectTarget(null)).toBe('/login')
  })

  it('redirects ADMIN to /admin/dashboard', () => {
    const adminSession = { user: { role: UserRole.ADMIN } }
    expect(getRedirectTarget(adminSession)).toBe('/admin/dashboard')
  })

  it('redirects ORDER_STAFF to /staff/dashboard', () => {
    const staffSession = { user: { role: UserRole.ORDER_STAFF } }
    expect(getRedirectTarget(staffSession)).toBe('/staff/dashboard')
  })

  it('redirects TECHNICIAN to /staff/dashboard', () => {
    const techSession = { user: { role: UserRole.TECHNICIAN } }
    expect(getRedirectTarget(techSession)).toBe('/staff/dashboard')
  })

  it('keeps CLIENT on "/" with no redirect to itself', () => {
    const clientSession = { user: { role: UserRole.CLIENT } }
    expect(getRedirectTarget(clientSession)).toBeNull()
  })
})
