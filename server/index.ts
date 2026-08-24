import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const app = express()
app.use(cors())
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next() // skip JSON parsing here, let the route's own express.raw() handle it
  } else {
    express.json()(req, res, next)
  }
})

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


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Step A: Create order (called when visitor clicks "Proceed to Pay")
app.post('/api/payments/create-order', async (req, res) => {
  const { counsellorId, name, email, phone } = req.body

  const counsellor = await prisma.counsellor.findUnique({ where: { id: counsellorId } })
  if (!counsellor) return res.status(404).json({ error: 'Counsellor not found' })

  const order = await razorpay.orders.create({
    amount: Number(counsellor.fee) * 100, // Razorpay expects paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  })

  // Store a PENDING booking + payment, not yet confirmed
  const booking = await prisma.booking.create({
    data: {
      counsellorId,
      visitorName: name,
      visitorEmail: email,
      visitorPhone: phone,
      startTime: new Date(), // placeholder — real slot selection happens after payment (T-008+)
      status: 'PENDING',
      payment: {
        create: {
          amount: counsellor.fee,
          status: 'INITIATED',
          gatewayOrderId: order.id,
        },
      },
    },
  })

  res.json({ orderId: order.id, amount: order.amount, keyId: process.env.RAZORPAY_KEY_ID, bookingId: booking.id })
})

// Step B: Webhook — the ONLY place a payment gets confirmed (AC-2)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string
  const body = req.body

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const event = JSON.parse(body.toString())

  if (event.event === 'payment.captured') {
    const orderId = event.payload.payment.entity.order_id
    const paymentId = event.payload.payment.entity.id

    const payment = await prisma.payment.findFirst({ where: { gatewayOrderId: orderId } })
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', gatewayPaymentId: paymentId },
      })
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      })
    }
  }

  res.json({ received: true })
})

// Step C: Client-side failure notification — mark payment FAILED + booking CANCELLED
// Called when Razorpay fires the `payment.failed` event on the frontend.
// The webhook only fires on success (payment.captured), so failure must be
// recorded via this explicit client call.
app.post('/api/payments/mark-failed', async (req, res) => {
  const { bookingId } = req.body
  if (!bookingId) return res.status(400).json({ error: 'bookingId is required' })

  const payment = await prisma.payment.findUnique({ where: { bookingId } })
  if (!payment) return res.status(404).json({ error: 'Payment not found' })

  // Only mark failed if it is still INITIATED (idempotent guard)
  if (payment.status !== 'INITIATED') {
    return res.json({ skipped: true, reason: 'Payment already has terminal status' })
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED' },
  })
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  })

  res.json({ ok: true })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))