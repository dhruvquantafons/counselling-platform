import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Fetching all bookings...')
  const bookings = await prisma.booking.findMany({
    include: {
      counsellor: { select: { name: true } }
    }
  })
  console.log(`Total bookings found: ${bookings.length}`)
  console.log('Bookings:', bookings)

  const search = 'Dhruv'
  console.log(`Performing test search with term: "${search}"...`)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search.trim())
  const where: any = {}
  where.OR = [
    { visitorName: { contains: search, mode: 'insensitive' } },
    { counsellor: { name: { contains: search, mode: 'insensitive' } } }
  ]
  if (isUuid) {
    where.OR.push({ id: search.trim() })
  }

  try {
    const results = await prisma.booking.findMany({
      where,
      include: {
        counsellor: { select: { name: true } }
      }
    })
    console.log(`Search results: ${results.length} found.`, results)
  } catch (err: any) {
    console.error('Error during test search query:', err.message || err)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
