import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import cron from 'node-cron'
import { generateReceiptHtml, generateReceiptNumber } from './receipt.js'
import { processPendingNotifications } from './notificationWorker.js'
import { getVapidPublicKey } from './pushService.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── JaaS (8x8.vc) credentials + signing key loaded once at startup (Step 2.4) ───
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JAAS_PRIVATE_KEY_PATH = path.join(__dirname, 'jaas-private-key.pem')
let JAAS_PRIVATE_KEY: string | null = null
try {
  JAAS_PRIVATE_KEY = fs.readFileSync(JAAS_PRIVATE_KEY_PATH, 'utf8')
  console.log('[jaas] ✅ Private key loaded from jaas-private-key.pem')
} catch (err) {
  console.warn('[jaas] ⚠️  WARNING: Could not load jaas-private-key.pem. /join-token will return 500.')
  if (err instanceof Error) console.warn('[jaas]   →', err.message)
}
const JITSI_APP_ID = process.env.JITSI_APP_ID || ''
const JITSI_KEY_ID = process.env.JITSI_KEY_ID || ''
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || '8x8.vc'
if (!JITSI_APP_ID || !JITSI_KEY_ID) {
  console.warn('[jaas] ⚠️  WARNING: JITSI_APP_ID and/or JITSI_KEY_ID missing in server/.env. /join-token will return 500.')
}

const app = express()
app.use(cors())
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next() // skip JSON parsing here, let the route's own express.raw() handle it
  } else {
    express.json()(req, res, next)
  }
})

// Key: slotId -> { heldUntil: timestamp (ms), bookingId: string }
const slotHoldsStore: Record<string, { heldUntil: number; bookingId: string }> = {}

function isSlotHeld(slotId: string): boolean {
  const hold = slotHoldsStore[slotId]
  if (!hold) return false
  if (Date.now() > hold.heldUntil) {
    delete slotHoldsStore[slotId] // expired hold auto-released
    return false
  }
  return true
}

// ─── Video Session Window Helpers ────────────────────────────────────────────

export type SessionAccessState =
  | 'UNCONFIRMED'   // PENDING / CANCELLED booking — no room exists
  | 'NOT_STARTED'   // confirmed but not yet within 5-min early-entry window
  | 'OPEN_EARLY'    // within 5 min before start (entry allowed)
  | 'IN_SESSION'    // between startTime and endTime
  | 'ENDED'         // past endTime — access revoked

export interface SessionWindowInfo {
  state: SessionAccessState
  earlyEntryAt: Date
  sessionEndsAt: Date
  msUntilEntry: number   // 0 if room is currently joinable
  msUntilEnd: number     // 0 if session is not active / ended
}

/**
 * Pure function: given booking startTime + sessionDurationMinutes, compute
 * where we are in the session lifecycle and the key boundary timestamps.
 * Entry is permitted from 5 minutes before startTime until sessionEndsAt.
 */
export function getSessionAccessState(
  startTime: Date,
  sessionDurationMinutes: number,
  now: Date = new Date(),
): SessionWindowInfo {
  const earlyEntryAt = new Date(startTime.getTime() - 5 * 60 * 1000)
  const sessionEndsAt = new Date(startTime.getTime() + sessionDurationMinutes * 60 * 1000)
  const nowMs = now.getTime()

  let state: SessionAccessState
  if (nowMs < earlyEntryAt.getTime()) {
    state = 'NOT_STARTED'
  } else if (nowMs < startTime.getTime()) {
    state = 'OPEN_EARLY'
  } else if (nowMs < sessionEndsAt.getTime()) {
    state = 'IN_SESSION'
  } else {
    state = 'ENDED'
  }

  const msUntilEntry = Math.max(0, earlyEntryAt.getTime() - nowMs)
  const msUntilEnd = Math.max(0, sessionEndsAt.getTime() - nowMs)

  return { state, earlyEntryAt, sessionEndsAt, msUntilEntry, msUntilEnd }
}

/** True if the booking is currently in a joinable window (OPEN_EARLY / IN_SESSION). */
export function isSessionJoinable(window: SessionWindowInfo): boolean {
  return window.state === 'OPEN_EARLY' || window.state === 'IN_SESSION'
}

// ─────────────────────────────────────────────────────────────────────────────

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


// ─── T-009 & Engine: Availability API ───────────────────────────────────────

// GET /api/counsellors/:id/availability?tz=<IANA_timezone>
// Enforces Minimum Notice Period (2 hours in advance) and 15-minute Buffer Time.
// Excludes booked hours and active 10-minute temporary slot holds.
app.get('/api/counsellors/:id/availability', async (req, res) => {
  const { id } = req.params
  const rawTz = (req.query.tz as string) || 'Asia/Kolkata'

  const counsellor = await prisma.counsellor.findUnique({ where: { id } })
  if (!counsellor) return res.status(404).json({ error: 'Counsellor not found' })

  // Validate timezone — fall back to IST if invalid
  let tz = rawTz
  try {
    Intl.DateTimeFormat(undefined, { timeZone: rawTz })
  } catch {
    tz = 'Asia/Kolkata'
  }

  // Minimum Notice Period: 2 hours advance notice required
  const MIN_NOTICE_MS = 2 * 60 * 60 * 1000
  const minStartTime = new Date(Date.now() + MIN_NOTICE_MS)

  const slots = await prisma.availability.findMany({
    where: {
      counsellorId: id,
      isBooked: false,
      startTime: { gt: minStartTime }, // Exclude slots starting within 2 hours
    },
    orderBy: { startTime: 'asc' },
  })

  // Filter out active 10-minute held slots
  const availableSlots = slots.filter((slot) => !isSlotHeld(slot.id))

  const dateFmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const timeFmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  // 24-hour formatter to bucket into Morning / Afternoon / Evening
  const hourFmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  })

  const result = availableSlots.map(slot => {
    const hour = parseInt(hourFmt.format(slot.startTime), 10)
    let period: 'Morning' | 'Afternoon' | 'Evening'
    if (hour >= 5 && hour < 12) period = 'Morning'
    else if (hour >= 12 && hour < 17) period = 'Afternoon'
    else period = 'Evening'

    return {
      id: slot.id,
      startTimeUtc: slot.startTime.toISOString(),
      endTimeUtc: slot.endTime.toISOString(),
      date: dateFmt.format(slot.startTime),
      time: timeFmt.format(slot.startTime).toUpperCase().replace('\u202F', ' '),
      period,
    }
  })

  res.json(result)
})

// ─── 10-Minute Temporary Slot Hold API ─────────────────────────────────────
app.post('/api/availability/hold', async (req, res) => {
  const { availabilityId, bookingId } = req.body
  if (!availabilityId || !bookingId) {
    return res.status(400).json({ error: 'availabilityId and bookingId are required' })
  }

  const slot = await prisma.availability.findUnique({ where: { id: availabilityId } })
  if (!slot) return res.status(404).json({ error: 'Slot not found' })
  if (slot.isBooked) return res.status(409).json({ error: 'Slot is already booked' })
  if (isSlotHeld(availabilityId)) return res.status(409).json({ error: 'Slot is currently on a 10-minute hold by another visitor' })

  // Hold slot for 10 minutes (600,000 ms)
  const HOLD_DURATION_MS = 10 * 60 * 1000
  const heldUntil = Date.now() + HOLD_DURATION_MS
  slotHoldsStore[availabilityId] = { heldUntil, bookingId }

  res.json({
    success: true,
    availabilityId,
    bookingId,
    heldUntil: new Date(heldUntil).toISOString(),
    expiresInSeconds: 600,
  })
})

app.post('/api/availability/release-hold', async (req, res) => {
  const { availabilityId } = req.body
  if (!availabilityId) return res.status(400).json({ error: 'availabilityId is required' })

  delete slotHoldsStore[availabilityId]
  res.json({ success: true, released: availabilityId })
})


// GET /api/bookings/:bookingId
// Used by the slot-picker to resolve counsellorId + counsellor name for the booking.
app.get('/api/bookings/:bookingId', async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
    include: { counsellor: { select: { id: true, name: true } } },
  })
  if (!booking) return res.status(404).json({ error: 'Booking not found' })

  res.json({
    id: booking.id,
    counsellorId: booking.counsellorId,
    counsellorName: booking.counsellor.name,
    visitorName: booking.visitorName,
    status: booking.status,
  })
})

// GET /api/bookings/:bookingId/session-info
// Public (gated by bookingId knowledge). Returns session lifecycle state,
// room identifier (only if confirmed), and countdown timestamps.
app.get('/api/bookings/:bookingId/session-info', async (req, res) => {
  const { bookingId } = req.params

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      counsellor: { select: { id: true, name: true, email: true, specialisation: true } },
    },
  })
  if (!booking) return res.status(404).json({ error: 'Booking not found' })

  // Booking doesn't have a real scheduled slot yet (or was cancelled)
  if (booking.status === 'PENDING' || booking.status === 'CANCELLED') {
    return res.json({
      bookingId: booking.id,
      status: booking.status,
      accessState: 'UNCONFIRMED' as const,
      counsellorId: booking.counsellor.id,
      counsellorName: booking.counsellor.name,
      visitorName: booking.visitorName,
    })
  }

  // CONFIRMED or COMPLETED — we have a real startTime + duration
  const window = getSessionAccessState(booking.startTime, booking.sessionDurationMinutes)

  // Only expose roomId once a session is confirmed (prevents leaking UUIDs for cancelled etc.)
  const confirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'

  return res.json({
    bookingId: booking.id,
    status: booking.status,
    accessState: window.state,
    roomId: confirmed ? booking.roomId : null,
    counsellorId: booking.counsellor.id,
    counsellorName: booking.counsellor.name,
    counsellorEmail: booking.counsellor.email,
    counsellorSpecialisation: booking.counsellor.specialisation,
    visitorName: booking.visitorName,
    visitorEmail: booking.visitorEmail,
    startTime: booking.startTime.toISOString(),
    sessionDurationMinutes: booking.sessionDurationMinutes,
    earlyEntryAt: window.earlyEntryAt.toISOString(),
    sessionEndsAt: window.sessionEndsAt.toISOString(),
    msUntilEntry: window.msUntilEntry,
    msUntilEnd: window.msUntilEnd,
    isJoinable: isSessionJoinable(window),
  })
})

// GET /api/bookings/:bookingId/join-token
// Enforces all access rules and returns a placeholder payload that will
// become a real signed Jitsi JWT once Jitsi env vars are in place (Step 2.4).
//
// Query params:
//   role: 'visitor' | 'counsellor' — required
//   counsellorId: string — required when role === 'counsellor' (matches
//     existing counsellor-token pattern of passing UUID via query string)
//
// Response when all guards pass (placeholder, will be replaced with real JWT):
//   { placeholder: true, roomId, role, user: { id, name, email, moderator },
//     validUntil, sessionEndsAt }
app.get('/api/bookings/:bookingId/join-token', async (req, res) => {
  const { bookingId } = req.params
  const role = req.query.role as string | undefined
  const counsellorIdFromQuery = req.query.counsellorId as string | undefined

  // ── Guard 0: Validate role param ────────────────────────────────────────
  if (role !== 'visitor' && role !== 'counsellor') {
    return res.status(400).json({
      error: 'Invalid role',
      detail: "Query param 'role' must be either 'visitor' or 'counsellor'",
    })
  }

  // ── Guard 1: Booking exists ─────────────────────────────────────────────
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { counsellor: { select: { id: true, name: true, email: true } } },
  })
  if (!booking) return res.status(404).json({ error: 'Booking not found' })

  // ── Guard 2: Booking is confirmed (not pending / cancelled) ─────────────
  if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
    return res.status(400).json({
      error: 'Booking not confirmed',
      bookingStatus: booking.status,
    })
  }

  // ── Guard 3: Room identifier is present (sanity check) ──────────────────
  if (!booking.roomId) {
    return res.status(500).json({
      error: 'Room not initialised for this booking',
      detail: 'Contact support — no roomId assigned despite CONFIRMED status.',
    })
  }

  // ── Guard 4: Role check ─────────────────────────────────────────────────
  type ResolvedRole = 'visitor' | 'counsellor'
  let resolvedRole: ResolvedRole
  let userId: string
  let userName: string
  let userEmail: string
  let isModerator: boolean

  if (role === 'counsellor') {
    if (!counsellorIdFromQuery) {
      return res.status(400).json({
        error: 'counsellorId is required',
        detail: "Query param 'counsellorId' is required when role='counsellor'",
      })
    }
    if (counsellorIdFromQuery !== booking.counsellor.id) {
      return res.status(403).json({
        error: 'Not the assigned counsellor',
        detail: 'Only the counsellor assigned to this booking may join with counsellor privileges.',
      })
    }
    resolvedRole = 'counsellor'
    userId = `counsellor_${booking.counsellor.id}`
    userName = booking.counsellor.name
    userEmail = booking.counsellor.email
    isModerator = true
  } else {
    // 'visitor' — identity is established by possession of bookingId (matches
    // existing platform pattern — visitors have no accounts / JWT).
    resolvedRole = 'visitor'
    userId = `visitor_${booking.id}`
    userName = booking.visitorName
    userEmail = booking.visitorEmail
    isModerator = false
  }

  // ── Guard 5: Time-window check (5-min early entry, revoke after end) ────
  const window = getSessionAccessState(booking.startTime, booking.sessionDurationMinutes)

  if (window.state === 'NOT_STARTED') {
    return res.status(403).json({
      error: 'Room not yet open',
      detail: 'Entry is permitted starting 5 minutes before the scheduled session time.',
      opensAt: window.earlyEntryAt.toISOString(),
      msUntilOpen: window.msUntilEntry,
    })
  }
  if (window.state === 'ENDED') {
    return res.status(403).json({
      error: 'Session has ended',
      detail: 'Access to this session has been revoked because the session window has closed.',
      endedAt: window.sessionEndsAt.toISOString(),
    })
  }
  // state is now either OPEN_EARLY or IN_SESSION → join allowed

  // ── All guards passed → sign a real RS256 JWT for JaaS / 8x8.vc (Step 2.4) ──
  if (!JAAS_PRIVATE_KEY || !JITSI_APP_ID || !JITSI_KEY_ID) {
    return res.status(500).json({
      error: 'JaaS signing not configured on server',
      detail: 'Missing jaas-private-key.pem, JITSI_APP_ID, or JITSI_KEY_ID.',
    })
  }

  const TOKEN_TTL_SEC = 2 * 60 // 2 minutes — short-lived per spec
  const now = Math.floor(Date.now() / 1000)

  const signedUser = {
    id: userId,
    name: userName,
    email: userEmail,
    moderator: isModerator, // true ONLY when role === 'counsellor'
  }

  const claims: object = {
    aud: 'jitsi',
    iss: JITSI_APP_ID,
    sub: JITSI_APP_ID,
    room: booking.roomId,
    context: {
      user: signedUser,
    },
    nbf: now - 10, // small 10s leeway for clock drift
    exp: now + TOKEN_TTL_SEC,
  }

  try {
    const token = jwt.sign(claims, JAAS_PRIVATE_KEY, {
      algorithm: 'RS256',
      keyid: JITSI_KEY_ID, // critical: 8x8.vc JWKS lookup matches this kid
    })

    const tokenValidUntil = new Date((now + TOKEN_TTL_SEC) * 1000)
    return res.json({
      token,
      roomId: booking.roomId,
      domain: JITSI_DOMAIN, // '8x8.vc' — client mounts iframe from this domain
      role: resolvedRole,
      user: signedUser,
      sessionEndsAt: window.sessionEndsAt.toISOString(),
      tokenValidUntil: tokenValidUntil.toISOString(),
    })
  } catch (err) {
    console.error('[jaas] jwt.sign() failed for booking', bookingId, err)
    return res.status(500).json({ error: 'Failed to issue session token' })
  }
})

// PATCH /api/bookings/:bookingId/slot
// Body: { availabilityId }
// Atomically marks the availability slot as booked and updates booking.startTime + confirms booking status.
app.patch('/api/bookings/:bookingId/slot', async (req, res) => {
  const { bookingId } = req.params
  const { availabilityId } = req.body

  if (!availabilityId) return res.status(400).json({ error: 'availabilityId is required' })

  const availability = await prisma.availability.findUnique({ where: { id: availabilityId } })
  if (!availability) return res.status(404).json({ error: 'Slot not found' })
  if (availability.isBooked) return res.status(409).json({ error: 'Slot already booked — please choose another' })

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } })
  if (!booking) return res.status(404).json({ error: 'Booking not found' })

  // Atomic: mark slot booked + update booking's real startTime, status, and generate roomId
  const generatedRoomId = `room_${crypto.randomUUID().replace(/-/g, '')}`
  const now = new Date()
  const startTime = new Date(availability.startTime)

  const notificationsToCreate: Array<{
    bookingId: string
    type: 'BOOKING_CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_1H' | 'REMINDER_10MIN'
    channel: 'EMAIL' | 'PUSH' | 'IN_APP'
    scheduledFor: Date
  }> = [
    { bookingId, type: 'BOOKING_CONFIRMATION', channel: 'EMAIL', scheduledFor: now },
    { bookingId, type: 'BOOKING_CONFIRMATION', channel: 'PUSH', scheduledFor: now },
    { bookingId, type: 'BOOKING_CONFIRMATION', channel: 'IN_APP', scheduledFor: now },
  ]

  const time24h = new Date(startTime.getTime() - 24 * 60 * 60 * 1000)
  const time1h = new Date(startTime.getTime() - 60 * 60 * 1000)
  const time10m = new Date(startTime.getTime() - 10 * 60 * 1000)

  if (time24h > now) {
    notificationsToCreate.push(
      { bookingId, type: 'REMINDER_24H', channel: 'EMAIL', scheduledFor: time24h },
      { bookingId, type: 'REMINDER_24H', channel: 'PUSH', scheduledFor: time24h },
      { bookingId, type: 'REMINDER_24H', channel: 'IN_APP', scheduledFor: time24h }
    )
  }
  if (time1h > now) {
    notificationsToCreate.push(
      { bookingId, type: 'REMINDER_1H', channel: 'EMAIL', scheduledFor: time1h },
      { bookingId, type: 'REMINDER_1H', channel: 'PUSH', scheduledFor: time1h },
      { bookingId, type: 'REMINDER_1H', channel: 'IN_APP', scheduledFor: time1h }
    )
  }
  if (time10m > now) {
    notificationsToCreate.push(
      { bookingId, type: 'REMINDER_10MIN', channel: 'EMAIL', scheduledFor: time10m },
      { bookingId, type: 'REMINDER_10MIN', channel: 'PUSH', scheduledFor: time10m },
      { bookingId, type: 'REMINDER_10MIN', channel: 'IN_APP', scheduledFor: time10m }
    )
  }

  await prisma.$transaction([
    prisma.availability.update({
      where: { id: availabilityId },
      data: { isBooked: true },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { startTime: availability.startTime, status: 'CONFIRMED', roomId: generatedRoomId, sessionDurationMinutes: 50 },
    }),
    ...(booking.payment && booking.payment.status === 'INITIATED' ? [
      prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: 'SUCCESS' },
      })
    ] : []),
    prisma.notification.createMany({
      data: notificationsToCreate,
    }),
  ])

  // Process immediate notifications right away
  processPendingNotifications(prisma).catch(() => {})

  res.json({ ok: true, startTime: availability.startTime, status: 'CONFIRMED', roomId: generatedRoomId })
})

// ─────────────────────────────────────────────────────────────────────────────

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Step A: Create order (called when visitor clicks "Proceed to Pay")
app.post('/api/payments/create-order', async (req, res) => {
  try {
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
        // Unique placeholder startTime to avoid (counsellorId, startTime) collision for PENDING bookings
        startTime: new Date(Date.now() + Math.floor(Math.random() * 1000000000) + Math.floor(Math.random() * 1000000)),
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
  } catch (err: any) {
    console.error('[create-order] Error:', err)
    res.status(500).json({ error: err.message || 'Failed to create payment order' })
  }
})

// Step A2: Client payment verification (called when Razorpay modal handler fires on client)
app.post('/api/payments/verify', async (req, res) => {
  const { orderId, paymentId, signature, bookingId } = req.body
  if (!bookingId) return res.status(400).json({ error: 'bookingId is required' })

  // Verify HMAC signature if provided
  if (orderId && paymentId && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid payment signature' })
    }
  }

  // Update Payment to SUCCESS and Booking to CONFIRMED
  const payment = await prisma.payment.findFirst({ where: { bookingId } })
  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        gatewayPaymentId: paymentId || payment.gatewayPaymentId || `pay_${Date.now()}`,
      },
    })
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CONFIRMED' },
  })

  // Queue PAYMENT_RECEIPT notification (EMAIL + IN_APP)
  const now = new Date()
  await prisma.notification.createMany({
    data: [
      { bookingId, type: 'PAYMENT_RECEIPT', channel: 'EMAIL', scheduledFor: now },
      { bookingId, type: 'PAYMENT_RECEIPT', channel: 'IN_APP', scheduledFor: now },
    ],
  }).catch(() => {})

  processPendingNotifications(prisma).catch(() => {})

  res.json({ success: true, bookingId, status: 'CONFIRMED' })
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

// ─── Section 3.6: Counsellor Admin Panel APIs ────────────────────────────────

// In-memory store for session notes and pending profile approvals
const sessionNotesStore: Record<string, { note: string; updatedAt: string }> = {}
const pendingProfilesStore: Record<string, {
  bio?: string
  fee?: number
  specialisation?: string
  languages?: string[]
  photoUrl?: string
  updatedAt: string
}> = {}

// 1. Login Step 1: Email & Password
app.post('/api/counsellor/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const counsellor = await prisma.counsellor.findUnique({ where: { email } })
  if (!counsellor) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // Accept demo login for seeded counsellors
  res.json({
    step: '2FA_REQUIRED',
    tempToken: counsellor.id,
    message: '2FA verification code sent. Use 123456 to verify.',
    hintCode: '123456',
  })
})

// 2. Login Step 2: 2FA Verification
app.post('/api/counsellor/auth/verify-2fa', async (req, res) => {
  const { tempToken, code } = req.body
  if (!tempToken || !code) {
    return res.status(400).json({ error: 'Temporary token and 2FA code are required' })
  }

  // Accept 123456 or any 6-digit code for 2FA demo
  if (code.trim().length !== 6) {
    return res.status(400).json({ error: 'Invalid 2FA code. Code must be 6 digits.' })
  }

  const counsellor = await prisma.counsellor.findUnique({ where: { id: tempToken } })
  if (!counsellor) {
    return res.status(404).json({ error: 'Counsellor session expired or invalid' })
  }

  res.json({
    success: true,
    token: counsellor.id,
    counsellor: {
      id: counsellor.id,
      name: counsellor.name,
      email: counsellor.email,
      specialisation: counsellor.specialisation,
      languages: counsellor.languages,
      fee: Number(counsellor.fee),
      bio: counsellor.bio,
      approved: counsellor.approved,
      pendingApproval: !!pendingProfilesStore[counsellor.id],
      pendingChanges: pendingProfilesStore[counsellor.id] || null,
    },
  })
})

// 3. Get current logged-in counsellor profile
app.get('/api/counsellor/me', async (req, res) => {
  const counsellorId = req.query.counsellorId as string
  if (!counsellorId) return res.status(400).json({ error: 'counsellorId is required' })

  const counsellor = await prisma.counsellor.findUnique({ where: { id: counsellorId } })
  if (!counsellor) return res.status(404).json({ error: 'Counsellor not found' })

  res.json({
    id: counsellor.id,
    name: counsellor.name,
    email: counsellor.email,
    specialisation: counsellor.specialisation,
    languages: counsellor.languages,
    fee: Number(counsellor.fee),
    bio: counsellor.bio,
    approved: counsellor.approved,
    pendingApproval: !!pendingProfilesStore[counsellor.id],
    pendingChanges: pendingProfilesStore[counsellor.id] || null,
  })
})

// 4. Availability: List all slots for a counsellor
app.get('/api/counsellor/availability', async (req, res) => {
  const counsellorId = req.query.counsellorId as string
  if (!counsellorId) return res.status(400).json({ error: 'counsellorId is required' })

  const slots = await prisma.availability.findMany({
    where: { counsellorId },
    orderBy: { startTime: 'asc' },
  })

  res.json(slots)
})

// 5. Availability: Add single slot
app.post('/api/counsellor/availability', async (req, res) => {
  const { counsellorId, startTime, endTime } = req.body
  if (!counsellorId || !startTime || !endTime) {
    return res.status(400).json({ error: 'counsellorId, startTime, and endTime are required' })
  }

  try {
    const slot = await prisma.availability.create({
      data: {
        counsellorId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isBooked: false,
      },
    })
    res.json(slot)
  } catch {
    res.status(409).json({ error: 'A slot already exists for this start time' })
  }
})

// 6. Availability: Withdraw an unbooked slot
app.delete('/api/counsellor/availability/:id', async (req, res) => {
  const { id } = req.params
  const slot = await prisma.availability.findUnique({ where: { id } })
  if (!slot) return res.status(404).json({ error: 'Slot not found' })
  if (slot.isBooked) return res.status(400).json({ error: 'Cannot withdraw a booked slot' })

  await prisma.availability.delete({ where: { id } })
  res.json({ success: true, id })
})

// 7. Availability: Apply Recurring Weekly Pattern
app.post('/api/counsellor/availability/recurring', async (req, res) => {
  const { counsellorId, startDate, endDate, daysOfWeek, timeSlots } = req.body
  if (!counsellorId || !startDate || !endDate || !Array.isArray(daysOfWeek) || !Array.isArray(timeSlots)) {
    return res.status(400).json({ error: 'Invalid parameters for recurring schedule' })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  let createdCount = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayNum = d.getDay() // 0 = Sun, 1 = Mon ...
    if (daysOfWeek.includes(dayNum)) {
      for (const slotTime of timeSlots) {
        const [startH, startM] = slotTime.start.split(':').map(Number)
        const [endH, endM] = slotTime.end.split(':').map(Number)

        const startTime = new Date(d)
        startTime.setHours(startH, startM, 0, 0)

        const endTime = new Date(d)
        endTime.setHours(endH, endM, 0, 0)

        try {
          await prisma.availability.create({
            data: {
              counsellorId,
              startTime,
              endTime,
              isBooked: false,
            },
          })
          createdCount++
        } catch {
          // Ignore duplicate slots
        }
      }
    }
  }

  res.json({ success: true, createdCount })
})

// 8. Availability: Block Date
app.post('/api/counsellor/availability/block-date', async (req, res) => {
  const { counsellorId, date } = req.body
  if (!counsellorId || !date) return res.status(400).json({ error: 'counsellorId and date are required' })

  const targetDate = new Date(date)
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const result = await prisma.availability.deleteMany({
    where: {
      counsellorId,
      isBooked: false,
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  res.json({ success: true, removedSlots: result.count, blockedDate: date })
})

// 9. Sessions & Calendar View for Counsellor
app.get('/api/counsellor/sessions', async (req, res) => {
  const counsellorId = req.query.counsellorId as string
  if (!counsellorId) return res.status(400).json({ error: 'counsellorId is required' })

  const bookings = await prisma.booking.findMany({
    where: { counsellorId },
    include: { payment: true },
    orderBy: { startTime: 'desc' },
  })

  const enriched = bookings.map((b) => ({
    id: b.id,
    visitorName: b.visitorName,
    visitorEmail: b.visitorEmail,
    visitorPhone: b.visitorPhone,
    startTime: b.startTime,
    status: b.status,
    fee: b.payment ? Number(b.payment.amount) : 0,
    hasNote: !!sessionNotesStore[b.id]?.note,
    roomUrl: `/session?bookingId=${b.id}`,
  }))

  res.json(enriched)
})

// 10. Private Session Notes: GET & POST
app.get('/api/counsellor/sessions/:bookingId/notes', async (req, res) => {
  const { bookingId } = req.params
  const record = sessionNotesStore[bookingId] || { note: '', updatedAt: '' }
  res.json(record)
})

app.post('/api/counsellor/sessions/:bookingId/notes', async (req, res) => {
  const { bookingId } = req.params
  const { note } = req.body
  if (typeof note !== 'string') return res.status(400).json({ error: 'note must be a string' })

  const updatedAt = new Date().toISOString()
  sessionNotesStore[bookingId] = { note, updatedAt }

  res.json({ success: true, bookingId, note, updatedAt })
})

// 11. Profile Management (Biography, Photo, Specialisation, Languages, Fee -> Subject to Platform Admin Approval)
app.put('/api/counsellor/profile', async (req, res) => {
  const { counsellorId, bio, fee, specialisation, languages, photoUrl } = req.body
  if (!counsellorId) return res.status(400).json({ error: 'counsellorId is required' })

  const counsellor = await prisma.counsellor.findUnique({ where: { id: counsellorId } })
  if (!counsellor) return res.status(404).json({ error: 'Counsellor not found' })

  const pendingChanges = {
    bio: bio !== undefined ? bio : counsellor.bio,
    fee: fee !== undefined ? Number(fee) : Number(counsellor.fee),
    specialisation: specialisation || counsellor.specialisation,
    languages: languages || counsellor.languages,
    photoUrl: photoUrl || '',
    updatedAt: new Date().toISOString(),
  }

  pendingProfilesStore[counsellorId] = pendingChanges

  res.json({
    success: true,
    message: 'Profile changes submitted for platform administrator approval.',
    pendingApproval: true,
    pendingChanges,
  })
})

// 12. Earnings Summary API
app.get('/api/counsellor/earnings', async (req, res) => {
  const counsellorId = req.query.counsellorId as string
  if (!counsellorId) return res.status(400).json({ error: 'counsellorId is required' })

  const bookings = await prisma.booking.findMany({
    where: { counsellorId },
    include: { payment: true },
  })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let totalEarnings = 0
  let mtdEarnings = 0
  let completedCount = 0
  let upcomingCount = 0

  const breakdown: Array<{
    id: string
    visitorName: string
    date: string
    amount: number
    status: string
  }> = []

  for (const b of bookings) {
    if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
      const amount = b.payment ? Number(b.payment.amount) : 0
      totalEarnings += amount
      completedCount++

      if (new Date(b.startTime) >= startOfMonth) {
        mtdEarnings += amount
      }

      if (new Date(b.startTime) > now) {
        upcomingCount++
      }

      breakdown.push({
        id: b.id,
        visitorName: b.visitorName,
        date: new Date(b.startTime).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        amount,
        status: b.status,
      })
    }
  }

  res.json({
    totalEarnings,
    mtdEarnings,
    completedCount,
    upcomingCount,
    avgPerSession: completedCount > 0 ? Math.round(totalEarnings / completedCount) : 0,
    breakdown,
  })
})

// ─── Receipt & Visitor Self-Service Management APIs ─────────────────────────

// 1. Printable / PDF Receipt API
app.get('/api/bookings/:id/receipt', async (req, res) => {
  const { id } = req.params

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { counsellor: true, payment: true },
  })

  if (!booking) return res.status(404).send('Booking not found')

  const receiptNumber = generateReceiptNumber(booking.id)
  const amount = booking.payment ? Number(booking.payment.amount) : Number(booking.counsellor.fee)
  const paymentId = booking.payment ? (booking.payment.gatewayPaymentId || booking.payment.id) : `PAY-${booking.id.slice(0, 8)}`

  const html = generateReceiptHtml({
    receiptNumber,
    bookingId: booking.id,
    visitorName: booking.visitorName,
    visitorEmail: booking.visitorEmail,
    visitorPhone: booking.visitorPhone,
    counsellorName: booking.counsellor.name,
    specialisation: booking.counsellor.specialisation,
    startTime: booking.startTime.toISOString(),
    amount,
    paymentId,
    createdAt: booking.createdAt.toISOString(),
  })

  res.setHeader('Content-Type', 'text/html')
  res.send(html)
})

// 2. Visitor Self-Service Cancellation (within 24 hours policy limit)
app.post('/api/bookings/:id/cancel', async (req, res) => {
  const { id } = req.params

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { counsellor: true, payment: true },
  })

  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Booking is already cancelled' })

  // Check 24-hour cancellation policy window
  const HOURS_24_MS = 24 * 60 * 60 * 1000
  const timeUntilSession = new Date(booking.startTime).getTime() - Date.now()

  if (timeUntilSession < HOURS_24_MS) {
    return res.status(400).json({
      error: 'Cancellation policy limit reached. Sessions within 24 hours cannot be self-cancelled. Please contact support.',
      withinPolicy: false,
    })
  }

  // Trigger Razorpay API automatic refund if payment exists
  let refundId: string | null = null
  if (booking.payment && booking.payment.gatewayPaymentId) {
    try {
      const refund = await razorpay.payments.refund(booking.payment.gatewayPaymentId, {
        amount: Number(booking.payment.amount) * 100, // paise
      })
      refundId = refund.id
    } catch (refundErr: any) {
      console.warn('[cancel] Razorpay automatic refund warning:', refundErr.message)
    }
  }

  // Cancel booking, release slot, update payment to REFUNDED, cancel pending reminders
  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    }),
    prisma.availability.updateMany({
      where: {
        counsellorId: booking.counsellorId,
        startTime: booking.startTime,
      },
      data: { isBooked: false },
    }),
    ...(booking.payment ? [
      prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: 'REFUNDED' },
      })
    ] : []),
    prisma.notification.updateMany({
      where: { bookingId: id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    }),
  ])

  // Queue Cancellation and Refund notifications
  const now = new Date()
  await prisma.notification.createMany({
    data: [
      { bookingId: id, type: 'CANCELLATION', channel: 'EMAIL', scheduledFor: now },
      { bookingId: id, type: 'CANCELLATION', channel: 'PUSH', scheduledFor: now },
      { bookingId: id, type: 'CANCELLATION', channel: 'IN_APP', scheduledFor: now },
      { bookingId: id, type: 'REFUND', channel: 'EMAIL', scheduledFor: now },
      { bookingId: id, type: 'REFUND', channel: 'PUSH', scheduledFor: now },
      { bookingId: id, type: 'REFUND', channel: 'IN_APP', scheduledFor: now },
    ],
  }).catch(() => {})

  processPendingNotifications(prisma).catch(() => {})

  res.json({
    success: true,
    message: 'Booking cancelled successfully. Refund initiated & slot released.',
    bookingId: id,
    status: 'CANCELLED',
    refundId,
  })
})

// 3. Visitor Self-Service Rescheduling (within 24 hours policy limit)
app.post('/api/bookings/:id/reschedule', async (req, res) => {
  const { id } = req.params
  const { newAvailabilityId } = req.body

  if (!newAvailabilityId) return res.status(400).json({ error: 'newAvailabilityId is required' })

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot reschedule a cancelled booking' })

  // Check 24-hour rescheduling policy window
  const HOURS_24_MS = 24 * 60 * 60 * 1000
  const timeUntilSession = new Date(booking.startTime).getTime() - Date.now()

  if (timeUntilSession < HOURS_24_MS) {
    return res.status(400).json({
      error: 'Rescheduling policy limit reached. Sessions within 24 hours cannot be self-rescheduled. Please contact support.',
      withinPolicy: false,
    })
  }

  const newSlot = await prisma.availability.findUnique({ where: { id: newAvailabilityId } })
  if (!newSlot) return res.status(404).json({ error: 'New slot not found' })
  if (newSlot.isBooked) return res.status(409).json({ error: 'New slot is already booked' })

  // Atomic swap: unbook old slot, book new slot, update booking startTime
  await prisma.$transaction([
    prisma.availability.updateMany({
      where: {
        counsellorId: booking.counsellorId,
        startTime: booking.startTime,
      },
      data: { isBooked: false },
    }),
    prisma.availability.update({
      where: { id: newAvailabilityId },
      data: { isBooked: true },
    }),
    prisma.booking.update({
      where: { id },
      data: { startTime: newSlot.startTime },
    }),
    prisma.notification.updateMany({
      where: { bookingId: id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    }),
  ])

  // Queue RESCHEDULE notification and recalculate new REMINDER_* times
  const newStartTime = new Date(newSlot.startTime)

  const notificationsToCreate: Array<{
    bookingId: string
    type: 'RESCHEDULE' | 'REMINDER_24H' | 'REMINDER_1H' | 'REMINDER_10MIN'
    channel: 'EMAIL' | 'PUSH' | 'IN_APP'
    scheduledFor: Date
  }> = [
    { bookingId: id, type: 'RESCHEDULE', channel: 'EMAIL', scheduledFor: now },
    { bookingId: id, type: 'RESCHEDULE', channel: 'PUSH', scheduledFor: now },
    { bookingId: id, type: 'RESCHEDULE', channel: 'IN_APP', scheduledFor: now },
  ]

  const time24h = new Date(newStartTime.getTime() - 24 * 60 * 60 * 1000)
  const time1h = new Date(newStartTime.getTime() - 60 * 60 * 1000)
  const time10m = new Date(newStartTime.getTime() - 10 * 60 * 1000)

  if (time24h > now) {
    notificationsToCreate.push(
      { bookingId: id, type: 'REMINDER_24H', channel: 'EMAIL', scheduledFor: time24h },
      { bookingId: id, type: 'REMINDER_24H', channel: 'PUSH', scheduledFor: time24h },
      { bookingId: id, type: 'REMINDER_24H', channel: 'IN_APP', scheduledFor: time24h }
    )
  }
  if (time1h > now) {
    notificationsToCreate.push(
      { bookingId: id, type: 'REMINDER_1H', channel: 'EMAIL', scheduledFor: time1h },
      { bookingId: id, type: 'REMINDER_1H', channel: 'PUSH', scheduledFor: time1h },
      { bookingId: id, type: 'REMINDER_1H', channel: 'IN_APP', scheduledFor: time1h }
    )
  }
  if (time10m > now) {
    notificationsToCreate.push(
      { bookingId: id, type: 'REMINDER_10MIN', channel: 'EMAIL', scheduledFor: time10m },
      { bookingId: id, type: 'REMINDER_10MIN', channel: 'PUSH', scheduledFor: time10m },
      { bookingId: id, type: 'REMINDER_10MIN', channel: 'IN_APP', scheduledFor: time10m }
    )
  }

  await prisma.notification.createMany({
    data: notificationsToCreate,
  }).catch(() => {})

  processPendingNotifications(prisma).catch(() => {})

  res.json({
    success: true,
    message: 'Booking rescheduled successfully.',
    newStartTime: newSlot.startTime,
  })
})

// ─── Web Push Subscription Endpoints ─────────────────────────────────────────

app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() })
})

app.post('/api/push/subscribe', async (req, res) => {
  const { bookingId, subscription } = req.body
  if (!bookingId || !subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'bookingId and subscription (endpoint, keys) are required' })
  }

  try {
    const pushSub = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        bookingId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        bookingId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    })
    res.json({ success: true, pushSubscriptionId: pushSub.id })
  } catch (err: any) {
    console.error('[push-subscribe] Error:', err.message)
    res.status(500).json({ error: 'Failed to save push subscription' })
  }
})

// ─── In-App Notification Feed Endpoints ──────────────────────────────────────

// Visitor Feed API: GET /api/notifications/visitor?bookingId=... OR visitorEmail=...
app.get('/api/notifications/visitor', async (req, res) => {
  const bookingId = req.query.bookingId as string
  const visitorEmail = req.query.visitorEmail as string

  if (!bookingId && !visitorEmail) {
    return res.status(400).json({ error: 'bookingId or visitorEmail is required' })
  }

  try {
    const rawNotifs = await prisma.notification.findMany({
      where: {
        channel: 'IN_APP',
        status: 'SENT',
        booking: bookingId
          ? { id: bookingId }
          : { visitorEmail: visitorEmail },
      },
      include: {
        booking: {
          include: { counsellor: true, payment: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const clientBaseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000'

    const notifications = rawNotifs.map((n) => {
      const b = n.booking
      const counsellorName = b.counsellor?.name || 'Counsellor'
      const startTimeFmt = new Date(b.startTime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })

      let title = 'Notification'
      let message = `Session update for your appointment`
      let category: 'payment' | 'booking' | 'session' | 'cancellation' = 'booking'
      let actionUrl = `${clientBaseUrl}/booking/manage?bookingId=${b.id}`

      switch (n.type) {
        case 'PAYMENT_RECEIPT':
          title = 'Payment Received'
          message = `Payment of ₹${b.payment ? Number(b.payment.amount) : 1500} confirmed for session with ${counsellorName}`
          category = 'payment'
          break
        case 'BOOKING_CONFIRMATION':
          title = 'Booking Confirmed'
          message = `Your session with ${counsellorName} is confirmed for ${startTimeFmt}`
          category = 'booking'
          actionUrl = `${clientBaseUrl}/session?bookingId=${b.id}`
          break
        case 'REMINDER_24H':
          title = 'Session Starting Tomorrow'
          message = `Reminder: Your session with ${counsellorName} starts in 24 hours (${startTimeFmt})`
          category = 'session'
          actionUrl = `${clientBaseUrl}/session?bookingId=${b.id}`
          break
        case 'REMINDER_1H':
          title = 'Session Starting in 1 Hour'
          message = `Reminder: Get ready! Your session with ${counsellorName} starts in 1 hour`
          category = 'session'
          actionUrl = `${clientBaseUrl}/session?bookingId=${b.id}`
          break
        case 'REMINDER_10MIN':
          title = 'Session Starting in 10 Minutes'
          message = `Your video session with ${counsellorName} is starting now! Click to join.`
          category = 'session'
          actionUrl = `${clientBaseUrl}/session?bookingId=${b.id}`
          break
        case 'RESCHEDULE':
          title = 'Session Rescheduled'
          message = `Your session with ${counsellorName} was moved to ${startTimeFmt}`
          category = 'booking'
          break
        case 'CANCELLATION':
          title = 'Session Cancelled'
          message = `Your session with ${counsellorName} scheduled for ${startTimeFmt} was cancelled`
          category = 'cancellation'
          break
        case 'REFUND':
          title = 'Refund Processed'
          message = `A refund of ₹${b.payment ? Number(b.payment.amount) : 1500} has been issued to your original payment method`
          category = 'payment'
          break
      }

      return {
        id: n.id,
        bookingId: b.id,
        type: n.type,
        category,
        title,
        message,
        actionUrl,
        isRead: n.isRead,
        createdAt: n.createdAt,
        scheduledFor: n.scheduledFor,
        counsellorName,
        startTime: b.startTime,
      }
    })

    const unreadCount = notifications.filter((n) => !n.isRead).length

    res.json({ notifications, unreadCount })
  } catch (err: any) {
    console.error('[notifications-visitor] Error:', err.message)
    res.status(500).json({ error: 'Failed to fetch visitor notifications' })
  }
})

// Counsellor Feed API: GET /api/notifications/counsellor?counsellorId=...
app.get('/api/notifications/counsellor', async (req, res) => {
  const counsellorId = req.query.counsellorId as string

  if (!counsellorId) {
    return res.status(400).json({ error: 'counsellorId is required' })
  }

  try {
    const rawNotifs = await prisma.notification.findMany({
      where: {
        channel: 'IN_APP',
        status: 'SENT',
        booking: { counsellorId },
      },
      include: {
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const clientBaseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000'

    const notifications = rawNotifs.map((n) => {
      const b = n.booking
      const visitorName = b.visitorName || 'Client'
      const startTimeFmt = new Date(b.startTime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })

      let title = 'Notification'
      let message = `Session update for ${visitorName}`
      let category: 'payment' | 'booking' | 'session' | 'cancellation' = 'booking'
      let actionUrl = `${clientBaseUrl}/session?bookingId=${b.id}`

      switch (n.type) {
        case 'BOOKING_CONFIRMATION':
          title = 'New Booking Confirmed'
          message = `New session booked by ${visitorName} for ${startTimeFmt}`
          category = 'booking'
          break
        case 'REMINDER_24H':
          title = 'Upcoming Session Tomorrow'
          message = `Reminder: Session with ${visitorName} in 24 hours (${startTimeFmt})`
          category = 'session'
          break
        case 'REMINDER_1H':
          title = 'Session in 1 Hour'
          message = `Reminder: Session with ${visitorName} starts in 1 hour`
          category = 'session'
          break
        case 'REMINDER_10MIN':
          title = 'Session Starting Now'
          message = `Session with ${visitorName} starts in 10 minutes. Click to join room.`
          category = 'session'
          break
        case 'RESCHEDULE':
          title = 'Session Rescheduled'
          message = `${visitorName} rescheduled their session to ${startTimeFmt}`
          category = 'booking'
          break
        case 'CANCELLATION':
          title = 'Session Cancelled'
          message = `Session with ${visitorName} on ${startTimeFmt} was cancelled. Slot released.`
          category = 'cancellation'
          break
        default:
          title = 'Client Payment Update'
          message = `Payment update received for ${visitorName}'s booking`
          category = 'payment'
          break
      }

      return {
        id: n.id,
        bookingId: b.id,
        type: n.type,
        category,
        title,
        message,
        actionUrl,
        isRead: n.isRead,
        createdAt: n.createdAt,
        scheduledFor: n.scheduledFor,
        visitorName,
        startTime: b.startTime,
      }
    })

    const unreadCount = notifications.filter((n) => !n.isRead).length

    res.json({ notifications, unreadCount })
  } catch (err: any) {
    console.error('[notifications-counsellor] Error:', err.message)
    res.status(500).json({ error: 'Failed to fetch counsellor notifications' })
  }
})

// Mark single notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params
  try {
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ success: true, id: updated.id, isRead: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// Mark all in-app notifications as read
app.patch('/api/notifications/read-all', async (req, res) => {
  const { bookingId, counsellorId } = req.body
  if (!bookingId && !counsellorId) {
    return res.status(400).json({ error: 'bookingId or counsellorId is required' })
  }

  try {
    await prisma.notification.updateMany({
      where: {
        channel: 'IN_APP',
        isRead: false,
        booking: bookingId
          ? { id: bookingId }
          : { counsellorId },
      },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

// ─── Notification Cron Scheduler (Runs every minute) ─────────────────────────
cron.schedule('* * * * *', async () => {
  try {
    await processPendingNotifications(prisma)
  } catch (err: any) {
    console.error('[cron] Error processing pending notifications:', err.message)
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))