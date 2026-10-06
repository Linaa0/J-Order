import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  preferredLanguage: z.enum(['en', 'rw', 'fr', 'sw']).optional(),
  currentPassword: z.string().min(6).max(255).optional(),
  newPassword: z.string().min(6).max(255).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      role: true,
      preferredLanguage: true,
      isActive: true,
      createdAt: true,
      staffCategories: { select: { category: true } },
    },
  })

  return NextResponse.json({ data: user })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } })

  if (parsed.data.currentPassword || parsed.data.newPassword) {
    if (!parsed.data.newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    }

    if (user?.passwordHash) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }

      const isCurrentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
      select: { id: true, phone: true, name: true, preferredLanguage: true, role: true },
    })

    return NextResponse.json({ data: updated })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      preferredLanguage: parsed.data.preferredLanguage,
    },
    select: { id: true, phone: true, name: true, preferredLanguage: true, role: true },
  })

  return NextResponse.json({ data: updated })
}
