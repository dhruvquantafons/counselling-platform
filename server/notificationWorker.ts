import { PrismaClient } from '@prisma/client'
import {
  sendPaymentReceiptEmail,
  sendBookingConfirmationEmail,
  sendSessionReminderEmail,
  sendRescheduleEmail,
  sendCancellationEmail,
  sendRefundEmail,
} from './emailService.js'
import { sendPushToBooking } from './pushService.js'

export async function processPendingNotifications(prisma: PrismaClient) {
  const now = new Date()

  const pendingList = await prisma.notification.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    include: {
      booking: {
        include: {
          counsellor: true,
          payment: true,
        },
      },
    },
    take: 50,
  })

  if (pendingList.length === 0) {
    return { processed: 0 }
  }

  const clientBaseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000'

  for (const notif of pendingList) {
    const booking = notif.booking
    if (!booking) {
      await prisma.notification.update({
        where: { id: notif.id },
        data: { status: 'CANCELLED', error: 'Booking missing' },
      })
      continue
    }

    // Skip sending reminders for cancelled bookings
    if (booking.status === 'CANCELLED' && notif.type.startsWith('REMINDER_')) {
      await prisma.notification.update({
        where: { id: notif.id },
        data: { status: 'CANCELLED' },
      })
      continue
    }

    const visitorName = booking.visitorName
    const counsellorName = booking.counsellor?.name || 'Counsellor'
    const toEmail = booking.visitorEmail
    const startTimeFormatted = new Date(booking.startTime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short',
    })
    const joinUrl = `${clientBaseUrl}/session?bookingId=${booking.id}`

    try {
      if (notif.channel === 'EMAIL') {
        switch (notif.type) {
          case 'PAYMENT_RECEIPT': {
            const payment = booking.payment
            await sendPaymentReceiptEmail({
              toEmail,
              visitorName,
              receiptNumber: `REC-2026-${booking.id.slice(0, 6).toUpperCase()}`,
              amount: payment ? Number(payment.amount) : 1500,
              paymentMode: 'Card / Online',
              paymentId: payment?.gatewayPaymentId || `pay_${booking.id.slice(0, 8)}`,
              date: new Date(booking.createdAt).toLocaleDateString('en-IN'),
            })
            break
          }
          case 'BOOKING_CONFIRMATION': {
            await sendBookingConfirmationEmail({
              toEmail,
              visitorName,
              counsellorName,
              startTime: startTimeFormatted,
              durationMinutes: booking.sessionDurationMinutes || 50,
              joinUrl,
              bookingId: booking.id,
            })
            break
          }
          case 'REMINDER_24H': {
            await sendSessionReminderEmail({
              toEmail,
              visitorName,
              counsellorName,
              startTime: startTimeFormatted,
              reminderType: '24h',
              joinUrl,
            })
            break
          }
          case 'REMINDER_1H': {
            await sendSessionReminderEmail({
              toEmail,
              visitorName,
              counsellorName,
              startTime: startTimeFormatted,
              reminderType: '1h',
              joinUrl,
            })
            break
          }
          case 'REMINDER_10MIN': {
            await sendSessionReminderEmail({
              toEmail,
              visitorName,
              counsellorName,
              startTime: startTimeFormatted,
              reminderType: '10m',
              joinUrl,
            })
            break
          }
          case 'RESCHEDULE': {
            await sendRescheduleEmail({
              toEmail,
              visitorName,
              counsellorName,
              oldStartTime: 'Previous Time',
              newStartTime: startTimeFormatted,
              joinUrl,
            })
            break
          }
          case 'CANCELLATION': {
            await sendCancellationEmail({
              toEmail,
              visitorName,
              counsellorName,
              startTime: startTimeFormatted,
            })
            break
          }
          case 'REFUND': {
            const payment = booking.payment
            await sendRefundEmail({
              toEmail,
              visitorName,
              amount: payment ? Number(payment.amount) : 1500,
              refundId: `rfnd_${booking.id.slice(0, 8)}`,
              bookingId: booking.id,
            })
            break
          }
        }
      } else if (notif.channel === 'PUSH') {
        let title = 'Whybeigh Notification'
        let body = `Session update for your appointment with ${counsellorName}`

        if (notif.type === 'BOOKING_CONFIRMATION') {
          title = 'Booking Confirmed'
          body = `Session with ${counsellorName} scheduled for ${startTimeFormatted}`
        } else if (notif.type === 'REMINDER_24H') {
          title = 'Session Tomorrow'
          body = `Reminder: Session with ${counsellorName} starts in 24 hours`
        } else if (notif.type === 'REMINDER_1H') {
          title = 'Session Starting Soon'
          body = `Reminder: Session with ${counsellorName} starts in 1 hour`
        } else if (notif.type === 'REMINDER_10MIN') {
          title = 'Join Session Now'
          body = `Session with ${counsellorName} starts in 10 minutes. Click to join video call.`
        } else if (notif.type === 'RESCHEDULE') {
          title = 'Session Rescheduled'
          body = `Your session with ${counsellorName} was moved to ${startTimeFormatted}`
        } else if (notif.type === 'CANCELLATION') {
          title = 'Session Cancelled'
          body = `Your session with ${counsellorName} has been cancelled.`
        } else if (notif.type === 'REFUND') {
          title = 'Refund Issued'
          body = `Refund issued for booking ${booking.id.slice(0, 8)}`
        }

        await sendPushToBooking(prisma, booking.id, {
          title,
          body,
          url: joinUrl,
        })
      } else if (notif.channel === 'IN_APP') {
        // IN_APP notifications are delivered directly via DB feed queries upon status='SENT'
      }

      await prisma.notification.update({
        where: { id: notif.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      })
    } catch (err: any) {
      console.error(`[Worker Error] Notification ${notif.id} (${notif.type}):`, err.message)
      await prisma.notification.update({
        where: { id: notif.id },
        data: {
          status: 'FAILED',
          error: err.message || 'Unknown error',
        },
      })
    }
  }

  return { processed: pendingList.length }
}
