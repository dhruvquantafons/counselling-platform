/**
 * seed-availability.ts
 * Seeds 7 days of demo availability slots for every counsellor in the DB.
 * Run with: npx dotenv-cli -e .env -- npx tsx prisma/seed-availability.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Slot templates: [hour, minute] pairs in IST (UTC+05:30)
// We'll convert to UTC before storing.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // IST = UTC + 5h30m

const SLOT_HOURS_IST = [
  [9, 0],   // 9:00 AM IST
  [10, 0],  // 10:00 AM IST
  [11, 0],  // 11:00 AM IST
  [14, 0],  // 2:00 PM IST
  [15, 30], // 3:30 PM IST
  [17, 0],  // 5:00 PM IST
  [18, 0],  // 6:00 PM IST
  [19, 30], // 7:30 PM IST
] as const

const SESSION_DURATION_MS = 50 * 60 * 1000 // 50 minutes

async function main() {
  const counsellors = await prisma.counsellor.findMany({ select: { id: true, name: true } })

  if (counsellors.length === 0) {
    console.log('No counsellors found. Run seed.ts first.')
    process.exit(1)
  }

  let created = 0

  for (const counsellor of counsellors) {
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      // Build a "today at midnight IST" base
      const nowUtc = new Date()
      // Midnight IST for target day
      const baseIst = new Date(nowUtc)
      baseIst.setUTCHours(0, 0, 0, 0)
      // Shift to IST midnight: IST midnight = UTC 18:30 of the previous day
      // Easier: just set the UTC date to the right offset
      const baseMidnightUtc = new Date(baseIst.getTime() - IST_OFFSET_MS + dayOffset * 24 * 60 * 60 * 1000)

      for (const [h, m] of SLOT_HOURS_IST) {
        const startTimeUtc = new Date(baseMidnightUtc.getTime() + (h * 60 + m) * 60 * 1000)
        const endTimeUtc = new Date(startTimeUtc.getTime() + SESSION_DURATION_MS)

        try {
          await prisma.availability.create({
            data: {
              counsellorId: counsellor.id,
              startTime: startTimeUtc,
              endTime: endTimeUtc,
              isBooked: false,
            },
          })
          created++
        } catch {
          // Skip if slot already exists (unique constraint on counsellorId + startTime)
        }
      }
    }
    console.log(`✓ ${counsellor.name} — slots created`)
  }

  console.log(`\nDone. Created ${created} availability slots across ${counsellors.length} counsellors.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
