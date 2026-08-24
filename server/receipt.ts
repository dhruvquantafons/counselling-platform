/**
 * receipt.ts
 * Generates styled PDF / HTML receipts and manages confirmation email generation.
 */

export type ReceiptData = {
  receiptNumber: string;
  bookingId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  counsellorName: string;
  specialisation: string;
  startTime: string;
  amount: number;
  paymentId: string;
  createdAt: string;
};

export function generateReceiptNumber(bookingId: string): string {
  const hash = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  return `REC-2026-${hash}`;
}

export function generateReceiptHtml(data: ReceiptData): string {
  const formattedDate = new Date(data.startTime).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = new Date(data.startTime).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${data.receiptNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #F7F5F0; color: #232C26; margin: 0; padding: 40px 20px; }
    .receipt-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E3E9E1; padding: 40px; box-shadow: 0 4px 20px rgba(74,99,85,0.08); }
    .header { text-align: center; border-b: 1px solid #E3E9E1; padding-bottom: 24px; margin-bottom: 28px; }
    .logo { font-size: 24px; font-weight: 700; color: #4A6355; letter-spacing: -0.5px; }
    .title { font-size: 14px; font-family: monospace; text-transform: uppercase; color: #B8804A; margin-top: 8px; tracking: 1px; }
    .badge { display: inline-block; background: #E3E9E1; color: #2F4438; font-size: 12px; font-family: monospace; padding: 4px 12px; border-radius: 20px; margin-top: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; font-size: 14px; }
    .label { font-size: 11px; font-family: monospace; text-transform: uppercase; color: #666; margin-bottom: 4px; }
    .value { font-weight: 500; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .table th, .table td { text-align: left; padding: 12px 0; border-b: 1px solid #F0F4EF; font-size: 14px; }
    .table th { font-size: 11px; font-family: monospace; text-transform: uppercase; color: #666; }
    .total-row { border-t: 2px solid #4A6355; font-size: 16px; font-weight: 700; }
    .footer { text-align: center; font-size: 12px; color: #888; border-t: 1px solid #E3E9E1; pt: 20px; margin-top: 30px; }
    @media print {
      body { background: white; padding: 0; }
      .receipt-card { border: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="logo">QuantaFONS Counselling</div>
      <div class="title">Official Payment Receipt</div>
      <div class="badge">PAID · ${data.receiptNumber}</div>
    </div>

    <div class="grid">
      <div>
        <div class="label">Billed To</div>
        <div class="value">${data.visitorName}</div>
        <div style="font-size: 12px; color: #666;">${data.visitorEmail}</div>
        <div style="font-size: 12px; color: #666;">${data.visitorPhone}</div>
      </div>
      <div>
        <div class="label">Receipt Details</div>
        <div class="value">Date: ${new Date(data.createdAt).toLocaleDateString()}</div>
        <div style="font-size: 12px; color: #666;">Payment Ref: ${data.paymentId.slice(0, 14)}</div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Counsellor</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>1-on-1 Counselling Session</strong><br>
            <span style="font-size: 12px; color: #666;">${formattedDate} at ${formattedTime}</span>
          </td>
          <td>${data.counsellorName}<br><span style="font-size: 11px; color: #888;">${data.specialisation}</span></td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">₹${data.amount}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">Total Paid</td>
          <td style="text-align: right; font-family: monospace; color: #2F4438;">₹${data.amount}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <p>Thank you for choosing QuantaFONS. This receipt serves as official proof of payment.</p>
      <p style="margin-top: 4px;">Confidential & Protected · GST Included</p>
    </div>
  </div>
</body>
</html>
  `;
}
