import { PrismaClient, UserRole, ProductCategory, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

function makeOrderNum(suffix: string): string {
  return `GES${Date.now().toString(36).toUpperCase()}${suffix}`
}

async function main() {
  console.log('Seeding database...')

  // Admin user
  const admin = await prisma.user.upsert({
    where: { phone: '+250780000001' },
    update: {},
    create: {
      phone: '+250780000001',
      name: 'Admin GES',
      email: 'admin@ges.rw',
      role: UserRole.ADMIN,
      preferredLanguage: 'en',
      isActive: true,
    },
  })

  // Order staff for gas refills and 6kg cylinders
  const staff1 = await prisma.user.upsert({
    where: { phone: '+250780000002' },
    update: {},
    create: {
      phone: '+250780000002',
      name: 'Jean Pierre Mutoni',
      role: UserRole.ORDER_STAFF,
      preferredLanguage: 'rw',
      isActive: true,
      staffCategories: {
        create: [
          { category: ProductCategory.GAS_REFILL },
          { category: ProductCategory.CYLINDER_6KG },
        ],
      },
    },
  })

  // Order staff for large cylinders
  const staff2 = await prisma.user.upsert({
    where: { phone: '+250780000003' },
    update: {},
    create: {
      phone: '+250780000003',
      name: 'Marie Claire Uwase',
      role: UserRole.ORDER_STAFF,
      preferredLanguage: 'fr',
      isActive: true,
      staffCategories: {
        create: [
          { category: ProductCategory.CYLINDER_12KG },
          { category: ProductCategory.CYLINDER_20KG },
          { category: ProductCategory.CYLINDER_38KG },
        ],
      },
    },
  })

  // Technician
  const tech = await prisma.user.upsert({
    where: { phone: '+250780000004' },
    update: {},
    create: {
      phone: '+250780000004',
      name: 'Samuel Bizimana',
      role: UserRole.TECHNICIAN,
      preferredLanguage: 'en',
      isActive: true,
    },
  })

  // Sample clients
  const client1 = await prisma.user.upsert({
    where: { phone: '+250788000001' },
    update: {},
    create: {
      phone: '+250788000001',
      name: 'Alice Mukamana',
      role: UserRole.CLIENT,
      preferredLanguage: 'rw',
      isActive: true,
    },
  })

  const client2 = await prisma.user.upsert({
    where: { phone: '+250788000002' },
    update: {},
    create: {
      phone: '+250788000002',
      name: 'Bob Nkurunziza',
      role: UserRole.CLIENT,
      preferredLanguage: 'en',
      isActive: true,
    },
  })

  // Sample orders
  const order1 = await prisma.order.create({
    data: {
      orderNumber: `GES-${Date.now()}-001`,
      clientId: client1.id,
      status: OrderStatus.CONFIRMED,
      deliveryAddress: 'KG 15 Ave, Kacyiru, Kigali',
      deliveryLat: -1.9415,
      deliveryLng: 30.0574,
      preferredDate: new Date(Date.now() + 86400000),
      preferredTime: '10:00',
      notes: 'Please call before arriving',
      items: {
        create: [
          { product: ProductCategory.GAS_REFILL, quantity: 2 },
        ],
      },
      statusHistory: {
        create: [
          {
            changedBy: client1.id,
            newStatus: OrderStatus.PENDING,
          },
          {
            changedBy: staff1.id,
            oldStatus: OrderStatus.PENDING,
            newStatus: OrderStatus.CONFIRMED,
          },
        ],
      },
    },
  })

  const order2 = await prisma.order.create({
    data: {
      orderNumber: `GES-${Date.now()}-002`,
      clientId: client2.id,
      status: OrderStatus.PENDING,
      deliveryAddress: 'KN 3 Rd, Nyarugenge, Kigali',
      deliveryLat: -1.9497,
      deliveryLng: 30.0592,
      preferredDate: new Date(Date.now() + 172800000),
      preferredTime: '14:00',
      items: {
        create: [
          { product: ProductCategory.CYLINDER_12KG, quantity: 1 },
        ],
      },
      statusHistory: {
        create: [
          {
            changedBy: client2.id,
            newStatus: OrderStatus.PENDING,
          },
        ],
      },
    },
  })

  const order3 = await prisma.order.create({
    data: {
      orderNumber: `GES-${Date.now()}-003`,
      clientId: client1.id,
      status: OrderStatus.OUT_FOR_DELIVERY,
      deliveryAddress: 'KG 15 Ave, Kacyiru, Kigali',
      deliveryLat: -1.9415,
      deliveryLng: 30.0574,
      preferredDate: new Date(),
      preferredTime: '09:00',
      assignedToId: tech.id,
      items: {
        create: [
          { product: ProductCategory.CYLINDER_6KG, quantity: 3 },
        ],
      },
      statusHistory: {
        create: [
          { changedBy: client1.id, newStatus: OrderStatus.PENDING },
          { changedBy: staff1.id, oldStatus: OrderStatus.PENDING, newStatus: OrderStatus.CONFIRMED },
          { changedBy: staff1.id, oldStatus: OrderStatus.CONFIRMED, newStatus: OrderStatus.PROCESSING },
          { changedBy: staff1.id, oldStatus: OrderStatus.PROCESSING, newStatus: OrderStatus.OUT_FOR_DELIVERY },
        ],
      },
    },
  })

  console.log('Seed complete. Created:')
  console.log('  Admin:', admin.phone)
  console.log('  Staff 1 (gas and 6kg):', staff1.phone)
  console.log('  Staff 2 (12kg, 20kg, 38kg):', staff2.phone)
  console.log('  Technician:', tech.phone)
  console.log('  Client 1:', client1.phone)
  console.log('  Client 2:', client2.phone)
  console.log('  Orders created:', [order1.orderNumber, order2.orderNumber, order3.orderNumber])
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
