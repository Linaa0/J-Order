import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const truckSchema = z.object({
  plateNumber: z.string().min(2).max(20),
  name: z.string().min(1).max(100),
  capacityKg: z.number().int().positive(),
  notes: z.string().max(500).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (
    session?.user?.role !== 'ADMIN' &&
    session?.user?.role !== 'ORDER_STAFF' &&
    session?.user?.role !== 'TECHNICIAN'
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const trucks = await prisma.truck.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ data: trucks })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const parsed = truckSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const truck = await prisma.truck.create({ data: parsed.data })
  return NextResponse.json({ data: truck }, { status: 201 })
}
