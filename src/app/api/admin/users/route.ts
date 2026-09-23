import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createStaffSchema = z.object({
  phone: z.string().min(10),
  name: z.string().min(2).max(100),
  role: z.enum(['ORDER_STAFF', 'TECHNICIAN']),
  categories: z.array(
    z.enum(['GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG'])
  ).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const staff = await prisma.user.findMany({
    where: { role: { in: ['ORDER_STAFF', 'TECHNICIAN', 'ADMIN'] } },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      staffCategories: { select: { category: true } },
      _count: { select: { assignedOrders: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: staff })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createStaffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { phone, name, role, categories } = parsed.data
  const { sanitizePhone } = await import('@/lib/utils')
  const cleanPhone = sanitizePhone(phone)

  const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } })
  if (existing) {
    return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      phone: cleanPhone,
      name,
      role,
      isActive: true,
      ...(categories && role === 'ORDER_STAFF'
        ? { staffCategories: { create: categories.map((c) => ({ category: c })) } }
        : {}),
    },
    include: { staffCategories: true },
  })

  return NextResponse.json({ data: user }, { status: 201 })
}
