import webpush from 'web-push'
import { PrismaClient } from '@prisma/client'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@whybeigh.com'

const isVapidConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)

if (isVapidConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY
}

export async function sendPushToBooking(
  prisma: PrismaClient,
  bookingId: string,
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  if (!isVapidConfigured) {
    console.log(`[WebPush Mock/Dev] BookingId: ${bookingId} | Title: "${payload.title}"`)
    return { mock: true, bookingId, payload }
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { bookingId },
  })

  if (subscriptions.length === 0) {
    return { sent: 0, reason: 'No push subscriptions found' }
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/favicon.ico',
    url: payload.url || `/session?bookingId=${bookingId}`,
  })

  let sentCount = 0

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    }

    try {
      await webpush.sendNotification(pushSub, notificationPayload)
      sentCount++
    } catch (err: any) {
      console.warn(`[WebPush Error] Endpoint ${sub.endpoint}:`, err.message)
      // 404 or 410 indicates subscription has expired or unsubscribed
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      }
    }
  }

  return { sent: sentCount, total: subscriptions.length }
}
