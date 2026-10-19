/**
 * Reset script: deletes all users except admins, along with their dependent data.
 * Usage:   ts-node --project tsconfig.seed.json scripts/reset-to-fresh.ts --confirm
 * Dry run: ts-node --project tsconfig.seed.json scripts/reset-to-fresh.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = !args.includes('--confirm')

  console.log('\nJ Order Reset Script')
  console.log('====================')
  if (isDryRun) {
    console.log('DRY RUN — pass --confirm to actually delete data\n')
  } else {
    console.log('LIVE RUN — data will be permanently deleted\n')
  }

  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD
  if (!adminPassword && !isDryRun) {
    console.error('ERROR: Set ADMIN_INITIAL_PASSWORD in your environment before running with --confirm')
    process.exit(1)
  }

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } })
  if (admins.length === 0) {
    console.error('ERROR: No admin accounts found. Refusing to run.')
    process.exit(1)
  }
  console.log(`Found ${admins.length} admin account(s):`)
  for (const a of admins) { console.log(`  ${a.name ?? 'Unnamed'} — ${a.phone ?? a.email}`) }

  const nonAdmins = await prisma.user.findMany({ where: { role: { not: 'ADMIN' } } })
  const nonAdminIds = nonAdmins.map((u) => u.id)
  console.log(`\nNon-admin users to delete: ${nonAdmins.length}`)

  const orderCount = await prisma.order.count({ where: { clientId: { in: nonAdminIds } } })
  const otpCount = await prisma.otpCode.count({ where: { userId: { in: nonAdminIds } } })
  const notifCount = await prisma.notification.count({ where: { userId: { in: nonAdminIds } } })

  console.log(`Orders to delete: ${orderCount}`)
  console.log(`OTP records to delete: ${otpCount}`)
  console.log(`Notifications to delete: ${notifCount}`)

  if (isDryRun) {
    console.log('\nDry run complete. Run with --confirm to execute.')
    return
  }

  console.log('\nExecuting reset in a transaction...')

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: { in: nonAdminIds } } })
    await tx.otpCode.deleteMany({ where: { userId: { in: nonAdminIds } } })
    await tx.orderStatusHistory.deleteMany({ where: { order: { clientId: { in: nonAdminIds } } } })
    await tx.paymentHistory.deleteMany({ where: { order: { clientId: { in: nonAdminIds } } } })
    await tx.orderItem.deleteMany({ where: { order: { clientId: { in: nonAdminIds } } } })
    await tx.order.deleteMany({ where: { clientId: { in: nonAdminIds } } })
    await tx.staffProductCategory.deleteMany({ where: { userId: { in: nonAdminIds } } })
    await tx.user.deleteMany({ where: { role: { not: 'ADMIN' } } })

    if (adminPassword) {
      const hash = await bcrypt.hash(adminPassword, 12)
      await tx.user.updateMany({
        where: { role: 'ADMIN' },
        data: { passwordHash: hash, mustChangePassword: true },
      })
      console.log('Admin password set from ADMIN_INITIAL_PASSWORD. Must change on next login.')
    }
  })

  console.log('\nReset complete.')
  console.log(`  Deleted ${nonAdmins.length} users`)
  console.log(`  Deleted ${orderCount} orders`)
  console.log(`  Kept ${admins.length} admin accounts`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
