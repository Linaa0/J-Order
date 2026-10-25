import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { detectContactType, normalizeEmail, normalizePhone } from '@/lib/contact'
import { verifyOtpHash } from '@/lib/otp'

const loginSchema = z.object({
  contact: z.string().min(4).max(255),
  otp: z.string().length(6).optional(),
  password: z.string().min(6).max(255).optional(),
})

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Email or Phone',
      credentials: {
        contact: { label: 'Email or Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { contact, otp, password } = parsed.data
        const type = detectContactType(contact)
        const normalizedContact = type === 'email' ? normalizeEmail(contact) : normalizePhone(contact)

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: normalizedContact },
              { phone: normalizedContact },
            ],
          },
          include: { staffCategories: true },
        })
        if (!user || !user.isActive) return null

        if (typeof password === 'string') {
          if (!user.passwordHash) return null
          const passwordMatches = await bcrypt.compare(password, user.passwordHash)
          if (!passwordMatches) return null

          if (user.phone) {
            await prisma.order.updateMany({
              where: {
                guestPhone: user.phone,
                clientId: { not: user.id },
              },
              data: {
                clientId: user.id,
                isGuestOrder: false,
              },
            }).catch(() => {})
          }

          return {
            id: user.id,
            phone: user.phone ?? '',
            name: user.name,
            email: user.email,
            role: user.role,
            preferredLanguage: user.preferredLanguage,
            staffCategories: user.staffCategories.map((c) => c.category),
            mustChangePassword: user.mustChangePassword,
          }
        }

        if (!otp) return null

        const activeOtp = await prisma.otpCode.findFirst({
          where: {
            userId: user.id,
            used: false,
            attemptCount: { lt: 5 },
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (!activeOtp) return null

        const isValid = verifyOtpHash(activeOtp.code, otp)
        if (!isValid) {
          const nextAttempts = activeOtp.attemptCount + 1
          await prisma.otpCode.update({
            where: { id: activeOtp.id },
            data: {
              attemptCount: nextAttempts,
              ...(nextAttempts >= 5 ? { used: true } : {}),
            },
          })
          return null
        }

        const consumed = await prisma.otpCode.updateMany({
          where: { id: activeOtp.id, used: false, attemptCount: { lt: 5 }, expiresAt: { gt: new Date() } },
          data: { used: true },
        })
        if (consumed.count !== 1) return null

        if (user.phone) {
          await prisma.order.updateMany({
            where: {
              guestPhone: user.phone,
              clientId: { not: user.id },
            },
            data: {
              clientId: user.id,
              isGuestOrder: false,
            },
          }).catch(() => {})
        }

        return {
          id: user.id,
          phone: user.phone ?? '',
          name: user.name,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          staffCategories: user.staffCategories.map((c) => c.category),
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.phone = (user as { phone?: string }).phone ?? ''
        token.role = (user as { role: string }).role
        token.preferredLanguage = (user as { preferredLanguage: string }).preferredLanguage
        token.staffCategories = (user as { staffCategories: string[] }).staffCategories ?? []
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.phone = token.phone as string
        session.user.role = token.role as string
        session.user.preferredLanguage = token.preferredLanguage as string
        session.user.staffCategories = (token.staffCategories as string[]) ?? []
        session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false
      }
      return session
    },
  },
}
