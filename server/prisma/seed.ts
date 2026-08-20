import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.counsellor.createMany({
    data: [
      {
        name: 'Dr. Anjali Mehta',
        email: 'anjali.mehta@example.com',
        specialisation: 'Anxiety & Stress Management',
        languages: ['English', 'Hindi'],
        fee: 1200,
        bio: 'Placeholder bio — Anjali has over 8 years of experience helping clients manage anxiety and stress.',
        approved: true,
      },
      {
        name: 'Rohan Sharma',
        email: 'rohan.sharma@example.com',
        specialisation: 'Relationship Counselling',
        languages: ['English', 'Hindi', 'Gujarati'],
        fee: 1500,
        bio: 'Placeholder bio — Rohan specialises in couples and family counselling.',
        approved: true,
      },
      {
        name: 'Dr. Priya Nair',
        email: 'priya.nair@example.com',
        specialisation: 'Depression & Mood Disorders',
        languages: ['English', 'Malayalam'],
        fee: 1800,
        bio: 'Placeholder bio — Priya is a clinical psychologist focused on mood disorders.',
        approved: true,
      },
      {
        name: 'Karan Verma',
        email: 'karan.verma@example.com',
        specialisation: 'Career & Life Coaching',
        languages: ['English', 'Hindi'],
        fee: 1000,
        bio: 'Placeholder bio — Karan helps clients navigate career transitions and life decisions.',
        approved: true,
      },
    ],
  })

  console.log('Seeded 4 counsellor records.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })