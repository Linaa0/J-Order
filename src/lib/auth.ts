import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { detectContactType, normalizeEmail, normalizePhone } from '@/lib/contact'

const loginSchema = z.object({
  contact: z.string().min(4).max(255),
  otp: z.string().length(6),
})

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Email or Phone OTP',
      credentials: {
        contact: { label: 'Email or Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { contact, otp } = parsed.data
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

        const otpRecord = await prisma.otpCode.findFirst({
          where: {
            userId: user.id,
            code: otp,
            used: false,
            attemptCount: { lt: 5 },
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (!otpRecord) {
          const activeOtp = await prisma.otpCode.findFirst({
            where: {
              userId: user.id,
              used: false,
              attemptCount: { lt: 5 },
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          })

          if (activeOtp) {
            await prisma.otpCode.update({
              where: { id: activeOtp.id },
              data: {
                attemptCount: { increment: 1 },
                ...(activeOtp.attemptCount >= 4 ? { used: true } : {}),
              },
            })
          }
          return null
        }

        const consumed = await prisma.otpCode.updateMany({
          where: { id: otpRecord.id, used: false, attemptCount: { lt: 5 }, expiresAt: { gt: new Date() } },
          data: { used: true },
        })
        if (consumed.count !== 1) return null

        return {
          id: user.id,
          phone: user.phone ?? '',
          name: user.name,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          staffCategories: user.staffCategories.map((c) => c.category),
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
      }
      return session
    },
  },
}
