import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function fixStuckRecords() {
  console.log('Fixing stuck PENDING bookings and INITIATED payments...')

  // Find all PENDING bookings
  const pendingBookings = await prisma.booking.findMany({
    include: { payment: true },
  })

  console.log(`Found ${pendingBookings.length} total bookings.`)

  let updatedBookings = 0
  let updatedPayments = 0

  for (const b of pendingBookings) {
    if (b.status === 'PENDING') {
      await prisma.booking.update({
        where: { id: b.id },
        data: { status: 'CONFIRMED' },
      })
      updatedBookings++
    }

    if (b.payment && b.payment.status === 'INITIATED') {
      await prisma.payment.update({
        where: { id: b.payment.id },
        data: {
          status: 'SUCCESS',
          gatewayPaymentId: b.payment.gatewayPaymentId || `pay_${Date.now()}_fixed`,
        },
      })
      updatedPayments++
    }
  }

  console.log(`✓ Updated ${updatedBookings} bookings to CONFIRMED.`)
  console.log(`✓ Updated ${updatedPayments} payments to SUCCESS.`)
}

fixStuckRecords()
  .catch((e) => {
    console.error('Error fixing records:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
