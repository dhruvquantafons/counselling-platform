import nodemailer from 'nodemailer'
import {
  getPaymentReceiptHtml,
  getBookingConfirmationHtml,
  getSessionReminderHtml,
  getRescheduleHtml,
  getCancellationHtml,
  getRefundHtml,
} from './emailTemplates.js'

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || 'notifications@whybeigh.com'

const isSmtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null

async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[Email Mock/Dev] To: ${to} | Subject: "${subject}"`)
    return { mock: true, to, subject }
  }

  try {
    const info = await transporter.sendMail({
      from: `Whybeigh Counselling <${EMAIL_FROM}>`,
      to,
      subject,
      html,
    })
    console.log(`[Email Sent] MessageId: ${info.messageId} | To: ${to}`)
    return info
  } catch (err: any) {
    console.error(`[Email Error] Failed to send email to ${to}:`, err.message)
    throw err
  }
}

export async function sendPaymentReceiptEmail(opts: {
  toEmail: string
  visitorName: string
  receiptNumber: string
  amount: number | string
  paymentMode: string
  paymentId: string
  date: string
}) {
  const html = getPaymentReceiptHtml(opts)
  return sendMail(opts.toEmail, `Payment Receipt [${opts.receiptNumber}] — Whybeigh`, html)
}

export async function sendBookingConfirmationEmail(opts: {
  toEmail: string
  visitorName: string
  counsellorName: string
  startTime: string
  durationMinutes: number
  joinUrl: string
  bookingId: string
}) {
  const html = getBookingConfirmationHtml(opts)
  return sendMail(opts.toEmail, `Booking Confirmed with ${opts.counsellorName} — Whybeigh`, html)
}

export async function sendSessionReminderEmail(opts: {
  toEmail: string
  visitorName: string
  counsellorName: string
  startTime: string
  reminderType: '24h' | '1h' | '10m'
  joinUrl: string
}) {
  const html = getSessionReminderHtml(opts)
  const timeLabel =
    opts.reminderType === '24h' ? '24 Hours' : opts.reminderType === '1h' ? '1 Hour' : '10 Minutes'

  return sendMail(
    opts.toEmail,
    `Session Reminder (${timeLabel}) — Whybeigh Session with ${opts.counsellorName}`,
    html
  )
}

export async function sendRescheduleEmail(opts: {
  toEmail: string
  visitorName: string
  counsellorName: string
  oldStartTime: string
  newStartTime: string
  joinUrl: string
}) {
  const html = getRescheduleHtml(opts)
  return sendMail(opts.toEmail, `Session Rescheduled — Whybeigh`, html)
}

export async function sendCancellationEmail(opts: {
  toEmail: string
  visitorName: string
  counsellorName: string
  startTime: string
}) {
  const html = getCancellationHtml(opts)
  return sendMail(opts.toEmail, `Session Cancelled Notice — Whybeigh`, html)
}

export async function sendRefundEmail(opts: {
  toEmail: string
  visitorName: string
  amount: number | string
  refundId: string
  bookingId: string
}) {
  const html = getRefundHtml(opts)
  return sendMail(opts.toEmail, `Refund Confirmation [₹${opts.amount}] — Whybeigh`, html)
}
