import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const loginSchema = z.object({
  phone: z.string().min(10),
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
      name: 'Phone OTP',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { phone, otp } = parsed.data

        const user = await prisma.user.findUnique({
          where: { phone },
          include: { staffCategories: true },
        })
        if (!user || !user.isActive) return null

        const otpRecord = await prisma.otpCode.findFirst({
          where: {
            userId: user.id,
            code: otp,
            used: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (!otpRecord) return null

        await prisma.otpCode.update({
          where: { id: otpRecord.id },
          data: { used: true },
        })

        return {
          id: user.id,
          phone: user.phone,
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
        token.phone = (user as { phone: string }).phone
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
