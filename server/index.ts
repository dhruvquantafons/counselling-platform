import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const app = express()
app.use(cors())
app.use(express.json())

// GET all counsellors (directory)
app.get('/api/counsellors', async (req, res) => {
  const counsellors = await prisma.counsellor.findMany({
    where: { approved: true },
  })
  res.json(counsellors)
})

// GET single counsellor (profile page)
app.get('/api/counsellors/:id', async (req, res) => {
  const counsellor = await prisma.counsellor.findUnique({
    where: { id: req.params.id },
  })
  if (!counsellor) return res.status(404).json({ error: 'Not found' })
  res.json(counsellor)
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))