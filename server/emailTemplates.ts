// HTML Email Templates for Whybeigh Counselling Platform

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #FBF9F5;
  color: #1E2522;
  margin: 0;
  padding: 24px 12px;
`

const CONTAINER_STYLE = `
  max-width: 580px;
  margin: 0 auto;
  background-color: #FFFFFF;
  border: 1px solid rgba(74, 99, 85, 0.15);
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 4px 12px rgba(35, 44, 38, 0.04);
`

const HEADER_STYLE = `
  border-bottom: 1px solid rgba(74, 99, 85, 0.12);
  padding-bottom: 16px;
  margin-bottom: 24px;
`

const BRAND_LOGO_STYLE = `
  font-size: 20px;
  font-weight: 700;
  color: #2F4136;
  letter-spacing: -0.02em;
  text-decoration: none;
`

const FOOTER_STYLE = `
  border-top: 1px solid rgba(74, 99, 85, 0.12);
  margin-top: 32px;
  padding-top: 16px;
  font-size: 12px;
  color: rgba(30, 37, 34, 0.6);
  text-align: center;
`

const BUTTON_STYLE = `
  display: inline-block;
  background-color: #4A6355;
  color: #FFFFFF !important;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  padding: 12px 24px;
  border-radius: 9999px;
  margin-top: 16px;
  margin-bottom: 16px;
`

export function getPaymentReceiptHtml(opts: {
  visitorName: string
  receiptNumber: string
  amount: number | string
  paymentMode: string
  paymentId: string
  date: string
}): string {
  return `
    <div style="${BASE_STYLE}">
      <div style="${CONTAINER_STYLE}">
        <div style="${HEADER_STYLE}">
          <a href="#" style="${BRAND_LOGO_STYLE}">Whybeigh</a>
        </div>
        <h2 style="margin-top:0; color:#1E2522; font-size:20px;">Payment Receipt</h2>
        <p style="font-size:14px; color:#4A5550;">Hello ${opts.visitorName},</p>
        <p style="font-size:14px; color:#4A5550;">Thank you for your payment. Here is your official transaction summary:</p>

        <div style="background-color:#F5F2EB; border-radius:12px; padding:16px; margin:20px 0; font-size:13px; font-family:monospace;">
          <p style="margin:4px 0;"><strong>Receipt Number:</strong> ${opts.receiptNumber}</p>
          <p style="margin:4px 0;"><strong>Amount Paid:</strong> ₹${opts.amount}</p>
          <p style="margin:4px 0;"><strong>Payment Mode:</strong> ${opts.paymentMode}</p>
          <p style="margin:4px 0;"><strong>Transaction ID:</strong> ${opts.paymentId}</p>
          <p style="margin:4px 0;"><strong>Date:</strong> ${opts.date}</p>
          <p style="margin:4px 0;"><strong>Status:</strong> CONFIRMED</p>
        </div>

        <p style="font-size:13px; color:#6B7280;">You can download your detailed PDF receipt directly from your booking management dashboard anytime.</p>

        <div style="${FOOTER_STYLE}">
          Whybeigh Counselling Platform &bull; Professional & Confidential Care
        </div>
      </div>
    </div>
  `
}

export function getBookingConfirmationHtml(opts: {
  visitorName: string
  counsellorName: string
  startTime: string
  durationMinutes: number
  joinUrl: string
  bookingId: string
}): string {
  return `
    <div style="${BASE_STYLE}">
      <div style="${CONTAINER_STYLE}">
        <div style="${HEADER_STYLE}">
          <a href="#" style="${BRAND_LOGO_STYLE}">Whybeigh</a>
        </div>
        <h2 style="margin-top:0; color:#1E2522; font-size:20px;">Booking Confirmed</h2>
        <p style="font-size:14px; color:#4A5550;">Hello ${opts.visitorName},</p>
        <p style="font-size:14px; color:#4A5550;">Your counselling session with <strong>${opts.counsellorName}</strong> has been confirmed.</p>

        <div style="background-color:#F5F2EB; border-radius:12px; padding:16px; margin:20px 0; font-size:13px;">
          <p style="margin:4px 0;"><strong>Counsellor:</strong> ${opts.counsellorName}</p>
          <p style="margin:4px 0;"><strong>Scheduled Time:</strong> ${opts.startTime}</p>
          <p style="margin:4px 0;"><strong>Session Duration:</strong> ${opts.durationMinutes} Minutes</p>
          <p style="margin:4px 0;"><strong>Booking Ref:</strong> ${opts.bookingId}</p>
        </div>

        <div style="text-align:center;">
          <a href="${opts.joinUrl}" style="${BUTTON_STYLE}">Join Video Consultation</a>
        </div>

        <p style="font-size:13px; color:#6B7280;">Please join 5 minutes before your scheduled start time. You can reschedule or manage your session up to 24 hours in advance from your booking dashboard.</p>

        <div style="${FOOTER_STYLE}">
          Whybeigh Counselling Platform &bull; Professional & Confidential Care
        </div>
      </div>
    </div>
  `
}

export function getSessionReminderHtml(opts: {
  visitorName: string
  counsellorName: string
  startTime: string
  reminderType: '24h' | '1h' | '10m'
  joinUrl: string
}): string {
  const timeText =
    opts.reminderType === '24h'
      ? 'in 24 hours'
      : opts.reminderType === '1h'
      ? 'in 1 hour'
      : 'in 10 minutes'

  return `
    <div style="${BASE_STYLE}">
      <div style="${CONTAINER_STYLE}">
        <div style="${HEADER_STYLE}">
          <a href="#" style="${BRAND_LOGO_STYLE}">Whybeigh</a>
        </div>
        <h2 style="margin-top:0; color:#1E2522; font-size:20px;">Session Reminder: Starting ${timeText}</h2>
        <p style="font-size:14px; color:#4A5550;">Hello ${opts.visitorName},</p>
        <p style="font-size:14px; color:#4A5550;">This is a friendly reminder that your counselling session with <strong>${opts.counsellorName}</strong> starts ${timeText}.</p>

        <div style="background-color:#F5F2EB; border-radius:12px; padding:16px; margin:20px 0; font-size:13px;">
          <p style="margin:4px 0;"><strong>Counsellor:</strong> ${opts.counsellorName}</p>
          <p style="margin:4px 0;"><strong>Session Time:</strong> ${opts.startTime}</p>
        </div>

        <div style="text-align:center;">
          <a href="${opts.joinUrl}" style="${BUTTON_STYLE}">Join Video Consultation</a>
        </div>

        <div style="${FOOTER_STYLE}">
          Whybeigh Counselling Platform &bull; Professional & Confidential Care
        </div>
      </div>
    </div>
  `
}

export function getRescheduleHtml(opts: {
  visitorName: string
  counsellorName: string
  oldStartTime: string
  newStartTime: string
  joinUrl: string
}): string {
  return `
    <div style="${BASE_STYLE}">
      <div style="${CONTAINER_STYLE}">
        <div style="${HEADER_STYLE}">
          <a href="#" style="${BRAND_LOGO_STYLE}">Whybeigh</a>
        </div>
        <h2 style="margin-top:0; color:#1E2522; font-size:20px;">Session Rescheduled</h2>
        <p style="font-size:14px; color:#4A5550;">Hello ${opts.visitorName},</p>
        <p style="font-size:14px; color:#4A5550;">Your counselling session with <strong>${opts.counsellorName}</strong> has been successfully rescheduled.</p>

        <div style="background-color:#F5F2EB; border-radius:12px; padding:16px; margin:20px 0; font-size:13px;">
          <p style="margin:4px 0; color:#854D0E;"><strong>Previous Time:</strong> ${opts.oldStartTime}</p>
          <p style="margin:4px 0; color:#15803D;"><strong>New Scheduled Time:</strong> ${opts.newStartTime}</p>
        </div>

        <div style="text-align:center;">
          <a href="${opts.joinUrl}" style="${BUTTON_STYLE}">View Updated Booking</a>
        </div>

        <div style="${FOOTER_STYLE}">
          Whybeigh Counselling Platform &bull; Professional & Confidential Care
        </div>
      </div>
    </div>
  `
}

export function getCancellationHtml(opts: {
  visitorName: string
  counsellorName: string
  startTime: string
}): string {
  return `
    <div style="${BASE_STYLE}">
      <div style="${CONTAINER_STYLE}">
        <div style="${HEADER_STYLE}">
          <a href="#" style="${BRAND_LOGO_STYLE}">Whybeigh</a>
        </div>
        <h2 style="margin-top:0; color:#1E2522; font-size:20px;">Session Cancelled</h2>
        <p style="font-size:14px; color:#4A5550;">Hello ${opts.visitorName},</p>
        <p style="font-size:14px; color:#4A5550;">Your counselling session with <strong>${opts.counsellorName}</strong> scheduled for <strong>${opts.startTime}</strong> has been cancelled.</p>

        <p style="font-size:13px; color:#6B7280;">If your cancellation was performed within the 24-hour advance policy window, your refund has been processed automatically. Details will follow in a separate refund confirmation email.</p>

        <div style="${FOOTER_STYLE}">
          Whybeigh Counselling Platform &bull; Professional & Confidential Care
        </div>
      </div>
    </div>
  `
}

export function getRefundHtml(opts: {
  visitorName: string
  amount: number | string
  refundId: string
  bookingId: string
}): string {
  return `
    <div style="${BASE_STYLE}">
      <div style="${CONTAINER_STYLE}">
        <div style="${HEADER_STYLE}">
          <a href="#" style="${BRAND_LOGO_STYLE}">Whybeigh</a>
        </div>
        <h2 style="margin-top:0; color:#1E2522; font-size:20px;">Refund Processed</h2>
        <p style="font-size:14px; color:#4A5550;">Hello ${opts.visitorName},</p>
        <p style="font-size:14px; color:#4A5550;">A refund has been issued for your cancelled booking.</p>

        <div style="background-color:#F5F2EB; border-radius:12px; padding:16px; margin:20px 0; font-size:13px; font-family:monospace;">
          <p style="margin:4px 0;"><strong>Refund Amount:</strong> ₹${opts.amount}</p>
          <p style="margin:4px 0;"><strong>Razorpay Refund Ref:</strong> ${opts.refundId}</p>
          <p style="margin:4px 0;"><strong>Booking Ref:</strong> ${opts.bookingId}</p>
          <p style="margin:4px 0;"><strong>Status:</strong> REFUNDED</p>
        </div>

        <p style="font-size:13px; color:#6B7280;">Refunds typically reflect in your original payment account (Card / UPI / Netbanking) within 5 to 7 business days depending on your bank.</p>

        <div style="${FOOTER_STYLE}">
          Whybeigh Counselling Platform &bull; Professional & Confidential Care
        </div>
      </div>
    </div>
  `
}
