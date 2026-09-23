import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(100).optional(),
  categories: z.array(
    z.enum(['GAS_REFILL', 'CYLINDER_6KG', 'CYLINDER_12KG', 'CYLINDER_20KG', 'CYLINDER_38KG'])
  ).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const { categories, ...updateData } = parsed.data

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
  })

  if (categories !== undefined) {
    await prisma.staffProductCategory.deleteMany({ where: { userId: params.id } })
    if (categories.length > 0) {
      await prisma.staffProductCategory.createMany({
        data: categories.map((c) => ({ userId: params.id, category: c })),
      })
    }
  }

  return NextResponse.json({ data: user })
}
