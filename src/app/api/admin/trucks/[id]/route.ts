import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacityKg: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'LOADING', 'ON_TRIP', 'MAINTENANCE']).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const truck = await prisma.truck.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json({ data: truck })
}
