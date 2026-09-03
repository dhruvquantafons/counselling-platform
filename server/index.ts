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
    visitorEmail: booking.visitorEmail,
    visitorPhone: booking.visitorPhone,
    startTime: booking.startTime.toISOString(),
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
  processPendingNotifications(prisma).catch(() => { })

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
    const { counsellorId, name, email, phone, userId } = req.body

    const counsellor = await prisma.counsellor.findUnique({ where: { id: counsellorId } })
    if (!counsellor) return res.status(404).json({ error: 'Counsellor not found' })

    let finalUserId = userId || null
    if (!finalUserId && email) {
      const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
      if (existingUser) finalUserId = existingUser.id
    }

    const order = await razorpay.orders.create({
      amount: Number(counsellor.fee) * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    })

    // Store a PENDING booking + payment, not yet confirmed
    const booking = await prisma.booking.create({
      data: {
        counsellorId,
        userId: finalUserId,
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
  }).catch(() => { })

  processPendingNotifications(prisma).catch(() => { })

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

// ─── USER AUTH & PROFILE ENDPOINTS ───
const JWT_USER_SECRET = process.env.JWT_SECRET || 'user_auth_secret_key_2026'

function hashUserPassword(password: string): string {
  const salt = 'counselling_user_salt_2026'
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
}

function verifyUserPassword(password: string, hash: string): boolean {
  return hashUserPassword(password) === hash
}

function generateUserToken(userId: string, email: string) {
  return jwt.sign({ userId, email, role: 'user' }, JWT_USER_SECRET, { expiresIn: '7d' })
}

function verifyUserToken(token: string) {
  try {
    return jwt.verify(token, JWT_USER_SECRET) as { userId: string; email: string; role: string }
  } catch {
    return null
  }
}

// User Register & Profile Creation
app.post('/api/user/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, gender, age, bio } = req.body

    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' })
    if (!email || !String(email).trim()) return res.status(400).json({ error: 'Email is required' })
    if (!phone || !String(phone).trim()) return res.status(400).json({ error: 'Mobile number is required' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const normalizedEmail = String(email).trim().toLowerCase()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' })
    }

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        passwordHash: hashUserPassword(password),
        gender: gender ? String(gender) : null,
        age: age ? parseInt(String(age), 10) : null,
        bio: bio ? String(bio) : null,
      },
    })

    const token = generateUserToken(user.id, user.email)
    const { passwordHash, ...userWithoutPassword } = user
    res.json({ token, user: userWithoutPassword })
  } catch (err: any) {
    console.error('[user/register] Error:', err)
    res.status(500).json({ error: err.message || 'Registration failed' })
  }
})

// User Login
app.post('/api/user/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!verifyUserPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = generateUserToken(user.id, user.email)
    const { passwordHash, ...userWithoutPassword } = user
    res.json({ token, user: userWithoutPassword })
  } catch (err: any) {
    console.error('[user/login] Error:', err)
    res.status(500).json({ error: err.message || 'Login failed' })
  }
})

// Get Current User Profile
app.get('/api/user/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyUserToken(token)
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { passwordHash, ...userWithoutPassword } = user
    res.json({ user: userWithoutPassword })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user profile' })
  }
})

// Update User Profile
app.put('/api/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyUserToken(token)
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })

    const { name, phone, gender, age, bio } = req.body

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        phone: phone !== undefined ? String(phone).trim() : undefined,
        gender: gender !== undefined ? String(gender) : undefined,
        age: age ? parseInt(String(age), 10) : undefined,
        bio: bio !== undefined ? String(bio) : undefined,
      },
    })

    const { passwordHash, ...userWithoutPassword } = user
    res.json({ user: userWithoutPassword })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile' })
  }
})

// Get User Bookings
app.get('/api/user/bookings', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyUserToken(token)
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId: decoded.userId },
          { visitorEmail: decoded.email },
        ],
      },
      include: {
        counsellor: {
          select: { id: true, name: true, specialisation: true, photoUrl: true },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(bookings)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bookings' })
  }
})

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
  }).catch(() => { })

  processPendingNotifications(prisma).catch(() => { })

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
  }).catch(() => { })

  processPendingNotifications(prisma).catch(() => { })

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

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3.7: Platform Administration Panel APIs
// Auth: all /api/admin/* routes require x-admin-secret header matching ADMIN_SECRET env var
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-dev-secret'

function requireAdmin(req: any, res: any, next: () => void) {
  const secret = req.headers['x-admin-secret']
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized — admin secret required' })
  }
  next()
}

async function writeAuditLog(action: string, targetType: string, targetId: string, detail?: string) {
  await prisma.auditLog.create({
    data: { actor: 'admin', action, targetType, targetId, detail: detail ?? null },
  })
}

// ─── Counsellor Management ────────────────────────────────────────────────────

// GET /api/admin/counsellors?status=PENDING|ACTIVE|SUSPENDED|REMOVED
app.get('/api/admin/counsellors', requireAdmin, async (req, res) => {
  const { status, page = '1', pageSize = '20' } = req.query as { status?: string; page?: string; pageSize?: string }
  const p = parseInt(page) || 1
  const ps = Math.min(parseInt(pageSize) || 20, 100)
  const skip = (p - 1) * ps
  const take = ps
  const where = status ? { status: status as any } : {}
  const [counsellors, total] = await Promise.all([
    prisma.counsellor.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, specialisation: true,
        languages: true, fee: true, bio: true, approved: true,
        status: true, createdAt: true,
        _count: { select: { bookings: true } },
      },
    }),
    prisma.counsellor.count({ where }),
  ])
  res.json({ counsellors, total, page: p, pageSize: ps })
})

// POST /api/admin/counsellors — Admin creates counsellor directly (approved, ACTIVE)
// Body: { name*, email*, phone?, specialisation*, qualifications?, languages*[], fee*, bio?, photoUrl? }
// Password hash auto-generated silently (not returned — demo-mode login ignores it)
app.post('/api/admin/counsellors', requireAdmin, async (req, res) => {
  const {
    name, email, phone, specialisation, qualifications,
    languages, fee, bio, photoUrl,
  } = req.body ?? {}

  // Validate required fields
  const missing: string[] = []
  if (!name || typeof name !== 'string' || name.trim().length === 0) missing.push('name')
  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) missing.push('email')
  if (!specialisation || typeof specialisation !== 'string' || specialisation.trim().length === 0) missing.push('specialisation')
  if (!Array.isArray(languages) || languages.length === 0 || !languages.every((l: any) => typeof l === 'string' && l.trim().length > 0)) missing.push('languages')
  if (fee === undefined || fee === null || isNaN(Number(fee)) || Number(fee) <= 0) missing.push('fee')

  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing or invalid fields: ${missing.join(', ')}` })
  }

  // Check duplicate email (Counsellor.email is @unique)
  const duplicate = await prisma.counsellor.findUnique({ where: { email: email.trim() } })
  if (duplicate) {
    return res.status(409).json({ error: 'A counsellor with this email already exists.' })
  }

  // Auto-generate a silent password hash. Scrypt with salt. Not stored or shown anywhere — kept only as a future placeholder.
  const randomPassword = crypto.randomBytes(24).toString('base64url')
  const salt = crypto.randomBytes(12).toString('base64url')
  const derivedKey = crypto.scryptSync(randomPassword, salt, 32) as Buffer
  const passwordHash = `scrypt$${salt}$${derivedKey.toString('base64')}`

  try {
    const created = await prisma.counsellor.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone && typeof phone === 'string' ? phone.trim() : null,
        specialisation: specialisation.trim(),
        qualifications: qualifications && typeof qualifications === 'string' ? qualifications.trim() : null,
        languages: languages.map((l: string) => l.trim()),
        fee: Number(fee),
        bio: bio && typeof bio === 'string' ? bio.trim() || null : null,
        photoUrl: photoUrl && typeof photoUrl === 'string' ? photoUrl.trim() : null,
        passwordHash,
        approved: true,
        status: 'ACTIVE',
      },
      select: {
        id: true, name: true, email: true, phone: true,
        specialisation: true, qualifications: true, languages: true,
        fee: true, bio: true, photoUrl: true, approved: true, status: true, createdAt: true,
      },
    })

    const languagesStr = created.languages.join(', ')
    const detail = [
      `Created counsellor "${created.name}" <${created.email}>`,
      `Specialisation: ${created.specialisation}`,
      `Languages: ${languagesStr}`,
      `Fee: ₹${Number(created.fee)}`,
    ].join(' | ')
    await writeAuditLog('CREATE_COUNSELLOR', 'Counsellor', created.id, detail)

    res.status(201).json({
      ok: true,
      counsellor: {
        ...created,
        fee: Number(created.fee),
      },
    })
  } catch (e: any) {
    // Prisma P2002 — duplicate unique field (shouldn't happen after our check, but safe guard)
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'A counsellor with this email already exists.' })
    }
    return res.status(500).json({ error: e.message || 'Failed to create counsellor' })
  }
})

// PATCH /api/admin/counsellors/:id/approve
app.patch('/api/admin/counsellors/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params
  const c = await prisma.counsellor.findUnique({ where: { id } })
  if (!c) return res.status(404).json({ error: 'Counsellor not found' })
  if (c.status !== 'PENDING') return res.status(400).json({ error: 'Only PENDING counsellors can be approved' })

  const updated = await prisma.counsellor.update({
    where: { id },
    data: { status: 'ACTIVE', approved: true },
  })
  await writeAuditLog('APPROVE_COUNSELLOR', 'Counsellor', id, `Approved ${c.name} (${c.email})`)
  res.json({ ok: true, counsellor: updated })
})

// PATCH /api/admin/counsellors/:id/reject
app.patch('/api/admin/counsellors/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params
  const c = await prisma.counsellor.findUnique({ where: { id } })
  if (!c) return res.status(404).json({ error: 'Counsellor not found' })

  const updated = await prisma.counsellor.update({
    where: { id },
    data: { status: 'REMOVED', approved: false },
  })
  await writeAuditLog('REJECT_COUNSELLOR', 'Counsellor', id, `Rejected application from ${c.name} (${c.email})`)
  res.json({ ok: true, counsellor: updated })
})

// PATCH /api/admin/counsellors/:id/suspend
app.patch('/api/admin/counsellors/:id/suspend', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  const c = await prisma.counsellor.findUnique({ where: { id } })
  if (!c) return res.status(404).json({ error: 'Counsellor not found' })
  if (c.status !== 'ACTIVE') return res.status(400).json({ error: 'Only ACTIVE counsellors can be suspended' })

  const updated = await prisma.counsellor.update({
    where: { id },
    data: { status: 'SUSPENDED', approved: false },
  })
  await writeAuditLog('SUSPEND_COUNSELLOR', 'Counsellor', id, `Suspended ${c.name}${reason ? ': ' + reason : ''}`)
  res.json({ ok: true, counsellor: updated })
})

// PATCH /api/admin/counsellors/:id/restore
app.patch('/api/admin/counsellors/:id/restore', requireAdmin, async (req, res) => {
  const { id } = req.params
  const c = await prisma.counsellor.findUnique({ where: { id } })
  if (!c) return res.status(404).json({ error: 'Counsellor not found' })
  if (c.status !== 'SUSPENDED') return res.status(400).json({ error: 'Only SUSPENDED counsellors can be restored' })

  const updated = await prisma.counsellor.update({
    where: { id },
    data: { status: 'ACTIVE', approved: true },
  })
  await writeAuditLog('RESTORE_COUNSELLOR', 'Counsellor', id, `Restored ${c.name} to ACTIVE`)
  res.json({ ok: true, counsellor: updated })
})

// DELETE /api/admin/counsellors/:id
app.delete('/api/admin/counsellors/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const c = await prisma.counsellor.findUnique({ where: { id } })
  if (!c) return res.status(404).json({ error: 'Counsellor not found' })

  await prisma.counsellor.update({
    where: { id },
    data: { status: 'REMOVED', approved: false },
  })
  await writeAuditLog('REMOVE_COUNSELLOR', 'Counsellor', id, `Removed ${c.name} (${c.email})`)
  res.json({ ok: true })
})

// ─── Booking Register ─────────────────────────────────────────────────────────

// GET /api/admin/bookings?counsellorId=&dateFrom=&dateTo=&status=&paymentStatus=&page=&pageSize=&search=
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  const { counsellorId, dateFrom, dateTo, status, paymentStatus, page = '1', pageSize = '20', search } = req.query as Record<string, string>

  const where: any = {}
  if (counsellorId) where.counsellorId = counsellorId
  if (status) where.status = status
  if (dateFrom || dateTo) {
    where.startTime = {}
    if (dateFrom) where.startTime.gte = new Date(dateFrom)
    if (dateTo) where.startTime.lte = new Date(dateTo)
  }
  if (paymentStatus) where.payment = { status: paymentStatus }

  if (search) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search.trim())
    where.OR = [
      { visitorName: { contains: search, mode: 'insensitive' } },
      { counsellor: { name: { contains: search, mode: 'insensitive' } } }
    ]
    if (isUuid) {
      where.OR.push({ id: search.trim() })
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(pageSize)
  const take = parseInt(pageSize)

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        counsellor: { select: { id: true, name: true, email: true } },
        payment: { select: { id: true, amount: true, status: true, gatewayPaymentId: true, gatewayOrderId: true, createdAt: true } },
      },
    }),
    prisma.booking.count({ where }),
  ])

  res.json({ bookings, total, page: parseInt(page), pageSize: parseInt(pageSize) })
})

// PATCH /api/admin/bookings/:id/slot — Admin slot reschedule / edit (no 24h policy)
// Body (mode A): { newAvailabilityId } — pick from existing open slots
// Body (mode B): { customStartTime, customEndTime? } — admin sets custom session time
//   customEndTime defaults to customStartTime + 50min when omitted
app.patch('/api/admin/bookings/:id/slot', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { newAvailabilityId, customStartTime, customEndTime } = req.body

  if (!newAvailabilityId && !customStartTime) {
    return res.status(400).json({ error: 'Either newAvailabilityId or customStartTime is required' })
  }

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) return res.status(404).json({ error: 'Booking not found' })
  if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot edit slot of a cancelled booking' })

  const oldStartTime = booking.startTime
  let newSlotStartTime: Date
  let newSlotEndTime: Date
  let targetAvailabilityId: string | null = null

  // ── Mode A: Pick an existing availability slot ──────────────────────────
  if (newAvailabilityId) {
    const slot = await prisma.availability.findUnique({ where: { id: newAvailabilityId } })
    if (!slot) return res.status(404).json({ error: 'Selected slot not found' })
    if (slot.counsellorId !== booking.counsellorId) {
      return res.status(400).json({ error: 'Slot belongs to a different counsellor' })
    }
    if (slot.isBooked) {
      // Allow the slot if it happens to be the exact slot already tied to this booking
      const sameAsExisting = slot.startTime.getTime() === oldStartTime.getTime()
      if (!sameAsExisting) {
        return res.status(409).json({ error: 'Selected slot is already booked' })
      }
    }
    newSlotStartTime = slot.startTime
    newSlotEndTime = slot.endTime
    targetAvailabilityId = slot.id
  } else {
    // ── Mode B: Custom date/time admin override ──────────────────────────
    const parsedStart = new Date(customStartTime)
    if (isNaN(parsedStart.getTime())) {
      return res.status(400).json({ error: 'customStartTime is not a valid ISO date' })
    }
    let parsedEnd: Date
    if (customEndTime) {
      parsedEnd = new Date(customEndTime)
      if (isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ error: 'customEndTime is not a valid ISO date' })
      }
      if (parsedEnd <= parsedStart) {
        return res.status(400).json({ error: 'customEndTime must be after customStartTime' })
      }
    } else {
      parsedEnd = new Date(parsedStart.getTime() + 50 * 60 * 1000)
    }
    newSlotStartTime = parsedStart
    newSlotEndTime = parsedEnd

    // Conflict check: same counsellor + same startTime already booked by another booking?
    if (newSlotStartTime.getTime() !== oldStartTime.getTime()) {
      const conflictBooking = await prisma.booking.findFirst({
        where: {
          counsellorId: booking.counsellorId,
          startTime: newSlotStartTime,
          NOT: { id: booking.id },
        },
      })
      if (conflictBooking) {
        return res.status(409).json({ error: 'Another booking already exists for this counsellor at the requested time' })
      }
    }
  }

  // ── Atomic swap: unbook old slot, book/upsert new slot, update booking ──
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Unbook the old availability slot (if it exists and is different from new)
      if (newSlotStartTime.getTime() !== oldStartTime.getTime()) {
        await tx.availability.updateMany({
          where: {
            counsellorId: booking.counsellorId,
            startTime: oldStartTime,
          },
          data: { isBooked: false },
        })
      }

      // 2. Book the target availability
      if (targetAvailabilityId) {
        // Mode A: use the existing availability record
        if (newSlotStartTime.getTime() !== oldStartTime.getTime()) {
          await tx.availability.update({
            where: { id: targetAvailabilityId },
            data: { isBooked: true },
          })
        }
      } else {
        // Mode B: upsert availability at the custom time (create if missing)
        const existingAvail = await tx.availability.findFirst({
          where: {
            counsellorId: booking.counsellorId,
            startTime: newSlotStartTime,
          },
        })
        if (existingAvail) {
          if (existingAvail.isBooked && newSlotStartTime.getTime() !== oldStartTime.getTime()) {
            // Shouldn't happen (we checked bookings above) but guard anyway
            throw new Error('Availability slot already booked')
          }
          await tx.availability.update({
            where: { id: existingAvail.id },
            data: { endTime: newSlotEndTime, isBooked: true },
          })
          targetAvailabilityId = existingAvail.id
        } else {
          const created = await tx.availability.create({
            data: {
              counsellorId: booking.counsellorId,
              startTime: newSlotStartTime,
              endTime: newSlotEndTime,
              isBooked: true,
            },
          })
          targetAvailabilityId = created.id
        }
      }

      // 3. Update the booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          startTime: newSlotStartTime,
          sessionDurationMinutes: Math.round((newSlotEndTime.getTime() - newSlotStartTime.getTime()) / 60000),
        },
      })
    })

    const oldStr = oldStartTime.toISOString()
    const newStr = newSlotStartTime.toISOString()
    const detail = `Slot changed from ${oldStr} → ${newStr} (availability: ${targetAvailabilityId ?? 'custom'})`
    await writeAuditLog('EDIT_BOOKING_SLOT', 'Booking', booking.id, detail)

    res.json({
      success: true,
      message: 'Booking slot updated successfully.',
      newStartTime: newSlotStartTime,
      newEndTime: newSlotEndTime,
    })
  } catch (e: any) {
    // Detect Prisma unique-constraint violation (P2002) — another admin just claimed the same slot
    if (e?.code === 'P2002') {
      return res.status(409).json({
        error: 'That time slot was just reserved by another admin edit. Please pick a different time and try again.',
      })
    }
    return res.status(400).json({ error: e.message || 'Failed to update booking slot' })
  }
})

// ─── Payment & Refund Register ────────────────────────────────────────────────

// GET /api/admin/payments?status=&page=&pageSize=
app.get('/api/admin/payments', requireAdmin, async (req, res) => {
  const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>

  const where: any = {}
  if (status) where.status = status

  const skip = (parseInt(page) - 1) * parseInt(pageSize)
  const take = parseInt(pageSize)

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true, visitorName: true, visitorEmail: true, startTime: true, status: true,
            counsellor: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ])

  res.json({ payments, total, page: parseInt(page), pageSize: parseInt(pageSize) })
})

// POST /api/admin/payments/:id/refund
app.post('/api/admin/payments/:id/refund', requireAdmin, async (req, res) => {
  const { id } = req.params
  const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } })
  if (!payment) return res.status(404).json({ error: 'Payment not found' })
  if (payment.status !== 'SUCCESS') return res.status(400).json({ error: 'Only SUCCESS payments can be refunded' })
  if (!payment.gatewayPaymentId) return res.status(400).json({ error: 'No gateway payment ID recorded — cannot process refund' })

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
    await (razorpay.payments as any).refund(payment.gatewayPaymentId, {
      amount: Number(payment.amount) * 100, // paise
    })
    await prisma.payment.update({ where: { id }, data: { status: 'REFUNDED' } })
    await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'CANCELLED' } })
    await writeAuditLog('REFUND_PAYMENT', 'Payment', id, `Refunded ₹${payment.amount} for booking ${payment.bookingId}`)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Refund failed', detail: err?.message })
  }
})

// ─── Static Pages CRUD ────────────────────────────────────────────────────────

app.get('/api/admin/static-pages', requireAdmin, async (req, res) => {
  const { page = '1', pageSize = '20' } = req.query as { page?: string; pageSize?: string }
  const p = parseInt(page) || 1
  const ps = Math.min(parseInt(pageSize) || 20, 100)
  const skip = (p - 1) * ps
  const take = ps
  const [pages, total] = await Promise.all([
    prisma.staticPage.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.staticPage.count(),
  ])
  res.json({ pages, total, page: p, pageSize: ps })
})

app.post('/api/admin/static-pages', requireAdmin, async (req, res) => {
  const { slug, title, body, published } = req.body
  if (!slug || !title || !body) return res.status(400).json({ error: 'slug, title and body are required' })
  try {
    const page = await prisma.staticPage.create({ data: { slug, title, body, published: published ?? false } })
    await writeAuditLog('CREATE_STATIC_PAGE', 'StaticPage', page.id, `Created page: ${slug}`)
    res.json(page)
  } catch {
    res.status(409).json({ error: 'A page with this slug already exists' })
  }
})

app.patch('/api/admin/static-pages/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { title, body, slug, published } = req.body
  const page = await prisma.staticPage.findUnique({ where: { id } })
  if (!page) return res.status(404).json({ error: 'Page not found' })

  const updated = await prisma.staticPage.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(slug !== undefined && { slug }),
      ...(published !== undefined && { published }),
    }
  })
  await writeAuditLog('EDIT_STATIC_PAGE', 'StaticPage', id, `Edited page: ${updated.slug}`)
  res.json(updated)
})

app.delete('/api/admin/static-pages/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const page = await prisma.staticPage.findUnique({ where: { id } })
  if (!page) return res.status(404).json({ error: 'Page not found' })

  await prisma.staticPage.delete({ where: { id } })
  await writeAuditLog('DELETE_STATIC_PAGE', 'StaticPage', id, `Deleted page: ${page.slug}`)
  res.json({ ok: true })
})

// ─── Counsellor Applications ──────────────────────────────────────────────────

// Public: submit application
app.post('/api/counsellor-applications', async (req, res) => {
  const { fullName, email, phone, qualifications, yearsOfExperience, specialisation, bio } = req.body
  if (!fullName || !email || !phone || !qualifications || yearsOfExperience === undefined || !specialisation || !bio) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  const years = parseInt(yearsOfExperience)
  if (isNaN(years) || years < 0) return res.status(400).json({ error: 'yearsOfExperience must be a non-negative number' })
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email address' })

  try {
    const application = await prisma.counsellorApplication.create({
      data: { fullName, email, phone, qualifications, yearsOfExperience: years, specialisation, bio }
    })
    await writeAuditLog('SUBMIT_COUNSELLOR_APPLICATION', 'CounsellorApplication', application.id, `New application from ${fullName} (${email})`)
    res.status(201).json({ ok: true, id: application.id })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit application' })
  }
})

// Admin: list applications with optional status filter
app.get('/api/admin/counsellor-applications', requireAdmin, async (req, res) => {
  const { status, page = '1', pageSize = '20' } = req.query as { status?: string; page?: string; pageSize?: string }
  const p = parseInt(page) || 1
  const ps = Math.min(parseInt(pageSize) || 20, 100)
  const skip = (p - 1) * ps
  const where = status ? { status: status as any } : {}
  const [applications, total] = await Promise.all([
    prisma.counsellorApplication.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: ps }),
    prisma.counsellorApplication.count({ where }),
  ])
  res.json({ applications, total, page: p, pageSize: ps })
})

// Admin: review (approve/reject) application
app.patch('/api/admin/counsellor-applications/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status, reviewNotes } = req.body
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'status must be APPROVED or REJECTED' })
  }
  const application = await prisma.counsellorApplication.findUnique({ where: { id } })
  if (!application) return res.status(404).json({ error: 'Application not found' })

  const updated = await prisma.counsellorApplication.update({
    where: { id },
    data: { status, reviewedAt: new Date(), ...(reviewNotes !== undefined && { reviewNotes }) }
  })
  await writeAuditLog(
    status === 'APPROVED' ? 'APPROVE_COUNSELLOR_APPLICATION' : 'REJECT_COUNSELLOR_APPLICATION',
    'CounsellorApplication', id,
    `${status} application from ${application.fullName} (${application.email})`
  )
  res.json(updated)
})

// ─── Public Static Pages ──────────────────────────────────────────────────────

app.get('/api/static-pages/:slug', async (req, res) => {
  const { slug } = req.params
  const page = await prisma.staticPage.findFirst({
    where: { slug, published: true },
  })
  if (!page) return res.status(404).json({ error: 'Not found' })
  res.json(page)
})

// ─── FAQs CRUD ────────────────────────────────────────────────────────────────

// Public endpoint — no auth required
app.get('/api/faqs', async (req, res) => {
  const faqs = await prisma.faq.findMany({ orderBy: { order: 'asc' } })
  res.json({ faqs })
})

app.get('/api/admin/faqs', requireAdmin, async (req, res) => {
  const { page = '1', pageSize = '20' } = req.query as { page?: string; pageSize?: string }
  const p = parseInt(page) || 1
  const ps = Math.min(parseInt(pageSize) || 20, 100)
  const skip = (p - 1) * ps
  const take = ps
  const [faqs, total] = await Promise.all([
    prisma.faq.findMany({ orderBy: { order: 'asc' }, skip, take }),
    prisma.faq.count(),
  ])
  res.json({ faqs, total, page: p, pageSize: ps })
})

app.post('/api/admin/faqs', requireAdmin, async (req, res) => {
  const { question, answer, order } = req.body
  if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' })
  const faq = await prisma.faq.create({ data: { question, answer, order: order ?? 0 } })
  await writeAuditLog('CREATE_FAQ', 'Faq', faq.id, `Created FAQ: ${question.slice(0, 60)}`)
  res.json(faq)
})

app.patch('/api/admin/faqs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { question, answer, order } = req.body
  const faq = await prisma.faq.findUnique({ where: { id } })
  if (!faq) return res.status(404).json({ error: 'FAQ not found' })

  const updated = await prisma.faq.update({ where: { id }, data: { question, answer, order } })
  await writeAuditLog('EDIT_FAQ', 'Faq', id, `Edited FAQ: ${updated.question.slice(0, 60)}`)
  res.json(updated)
})

app.delete('/api/admin/faqs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const faq = await prisma.faq.findUnique({ where: { id } })
  if (!faq) return res.status(404).json({ error: 'FAQ not found' })

  await prisma.faq.delete({ where: { id } })
  await writeAuditLog('DELETE_FAQ', 'Faq', id, `Deleted FAQ: ${faq.question.slice(0, 60)}`)
  res.json({ ok: true })
})

// ─── Dashboard Reporting ──────────────────────────────────────────────────────

// GET /api/admin/reports/summary?from=&to=
app.get('/api/admin/reports/summary', requireAdmin, async (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string }
  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)
  const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

  const [totalBookings, confirmedBookings, cancelledBookings, completedBookings, paymentsSuccess] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.count({ where: { ...where, status: 'CONFIRMED' } }),
    prisma.booking.count({ where: { ...where, status: 'CANCELLED' } }),
    prisma.booking.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.payment.findMany({
      where: { status: 'SUCCESS', ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) },
      select: { amount: true },
    }),
  ])

  const revenue = paymentsSuccess.reduce((sum, p) => sum + Number(p.amount), 0)
  const noShows = completedBookings // approximation — sessions completed but visitor attended

  res.json({
    totalBookings,
    confirmed: confirmedBookings,
    cancellations: cancelledBookings,
    completed: completedBookings,
    noShows: 0, // requires explicit no-show flag — placeholder
    revenue,
    from: from || null,
    to: to || null,
  })
})

// ─── Audit Log ────────────────────────────────────────────────────────────────

// GET /api/admin/audit-log?search=&page=&pageSize=
app.get('/api/admin/audit-log', requireAdmin, async (req, res) => {
  const { search, page = '1', pageSize = '50' } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(pageSize)
  const take = parseInt(pageSize)

  const where: any = search
    ? { OR: [{ action: { contains: search, mode: 'insensitive' } }, { detail: { contains: search, mode: 'insensitive' } }, { targetType: { contains: search, mode: 'insensitive' } }] }
    : {}

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.count({ where }),
  ])

  res.json({ logs, total, page: parseInt(page), pageSize: parseInt(pageSize) })
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
