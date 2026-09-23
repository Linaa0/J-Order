import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  preferredLanguage: z.enum(['en', 'rw', 'fr', 'sw']).optional(),
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

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { id: true, phone: true, name: true, preferredLanguage: true, role: true },
  })

  return NextResponse.json({ data: updated })
}
