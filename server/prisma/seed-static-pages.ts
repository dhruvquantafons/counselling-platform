/**
 * Seeds the three core StaticPage records:
 *   - /privacy-policy
 *   - /terms
 *   - /refund-policy
 *
 * Run against production:
 *   DATABASE_URL="<prod-db-url>" npx tsx prisma/seed-static-pages.ts
 *
 * Safe to re-run — uses upsert on slug, so existing pages are updated
 * rather than duplicated.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const pages = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    published: true,
    body: `Why Beigh ("Why Beigh", "we", "us", "our") is committed to protecting the privacy of everyone who uses our platform. This Privacy Policy explains what information we collect, how we use it, and your rights in relation to it.

1. Who We Are

Why Beigh is an online counselling and education-guidance platform. Our registered address for privacy and general enquiries is:

Why Beigh
Privacy and general enquiries: info@whybeigh.com

2. Information We Collect

We may collect the following categories of information when you use our platform:

Contact and identity information: name, email address, phone number.
Booking and payment information: session bookings, payment status, transaction references (we do not store full card numbers — payments are processed by Razorpay).
Usage information: pages visited, session duration, device type, browser, IP address, and other standard web analytics data.
Communications: messages you send to us via email or contact forms.
Session participation data: for online sessions, technical data needed to facilitate the video call (we do not record sessions without clear notice and consent).

3. How We Use Your Information

We use your information to:
- Deliver, manage, and improve our counselling and guidance services.
- Process bookings and payments.
- Send you confirmations, reminders, and service updates.
- Respond to your queries and support requests.
- Comply with our legal obligations.
- Detect and prevent fraud or misuse of our platform.

We do not sell your personal information to third parties.

4. Legal Basis for Processing

We process your information on the following legal bases:
- Performance of a contract — to deliver the services you have booked.
- Legitimate interests — to operate, secure, and improve our platform.
- Legal obligation — where required by applicable law.
- Consent — where you have given clear consent (e.g. marketing communications).

5. Sharing Your Information

We may share your information with:
- Service providers who help us deliver our services (e.g. payment processors, video-call providers, hosting providers), under appropriate data-processing agreements.
- Professional advisers (lawyers, accountants) as required.
- Regulatory authorities if required by law.

We do not share your information with advertisers or sell your data.

6. Data Retention

We retain your information for as long as necessary to provide our services and comply with our legal obligations. When your information is no longer needed, we delete or anonymise it securely.

7. Your Rights

Depending on applicable law, you may have the right to:
- Access the personal information we hold about you.
- Correct inaccurate information.
- Request deletion of your information.
- Object to or restrict certain processing.
- Data portability.

To exercise any of these rights, contact us at info@whybeigh.com.

8. Cookies

Our website may use essential cookies to operate correctly, and analytics cookies to understand how our platform is used. You can manage cookie preferences through your browser settings.

9. Security

We implement reasonable technical and organisational measures to protect your information from unauthorised access, disclosure, or loss. No system is completely secure; if you believe your information has been compromised, please contact us immediately.

10. Children

Our platform is not directed at children under 13. For minors participating in sessions, a parent or legal guardian must make the booking and provide consent.

11. Changes to This Policy

We may update this Privacy Policy from time to time. The updated version will be posted on this page with a revised date. Continued use of our services after a change constitutes acceptance.

12. Contact Us

For privacy questions or requests: info@whybeigh.com`,
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    published: true,
    body: `Please read these Terms & Conditions carefully before using the Why Beigh platform. By accessing or using our services, you agree to be bound by these terms.

1. About Why Beigh

Why Beigh ("Why Beigh", "we", "us", "our") provides education-focused counselling sessions, career guidance, profile-building support, and related programmes for parents and students. Our services are delivered online and, where announced, in person.

2. Eligibility

You must be 18 or older to book a session independently. Parents or legal guardians may book on behalf of minors. By using our platform, you confirm that you meet these requirements and that the information you provide is accurate.

3. Services

Our services are education and guidance in nature. Why Beigh does not provide medical advice, mental-health treatment, legal advice, or any regulated professional service. Our sessions are not a substitute for a qualified doctor, psychologist, therapist, lawyer, or other licensed professional. If you are experiencing a mental-health crisis or medical emergency, please contact emergency services.

4. Booking and Payment

Sessions are booked through the Why Beigh platform and must be paid for at the time of booking using the available payment methods. A booking is confirmed only after successful payment. Why Beigh reserves the right to cancel or reschedule sessions and will notify you as early as possible.

5. Cancellations and Refunds

Our Refund & Cancellation Policy forms part of these Terms. Please read it carefully before booking.

6. Conduct

You agree to:
- Treat counsellors and platform staff with courtesy and respect.
- Not record, distribute, or publish session content without prior written consent.
- Not use our platform for any unlawful, harmful, or fraudulent purpose.
- Provide accurate information when booking or communicating with us.

Why Beigh may suspend or terminate access for violations of these conduct requirements.

7. Intellectual Property

All content, materials, frameworks, worksheets, and resources provided by Why Beigh remain our intellectual property or that of our licensors. You may not copy, reproduce, or commercially use any content without our written permission.

8. Limitation of Liability

To the maximum extent permitted by law:
- Why Beigh is not liable for any indirect, incidental, or consequential loss arising from your use of our services.
- Our total liability for any claim arising from a session is limited to the amount paid for that session.
- We do not guarantee any specific outcome (academic, career, or otherwise) from our sessions.

9. Changes to Terms

We may update these Terms from time to time. The updated version will be posted on this page with a revised date. Continued use of our services constitutes acceptance.

10. Governing Law

These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of India.

11. Contact

For questions about these Terms: info@whybeigh.com`,
  },
  {
    slug: "refund-policy",
    title: "Refund & Cancellation Policy",
    published: true,
    body: `Why Beigh aims to make our refund and cancellation process straightforward and fair. Please read this policy before booking.

1. Our Standard Commitment

Why Beigh's standard preference is to offer a full refund for any cancellation request made before the relevant session or service begins. You do not need to give a reason for your cancellation request.

2. How to Request a Cancellation or Refund

Send your cancellation or refund request to: yb@whybeigh.com

Please include your booking reference or registered email address. We will acknowledge your request within 1 business day and process eligible refunds promptly.

3. Timing of Cancellation

Before the session starts: Full refund, no questions asked.
After the session has started or been delivered: Refunds are generally not available once a session has commenced, except at Why Beigh's discretion in the case of a service failure on our part.
No-shows: If you do not attend your booked session without prior notice, a refund may not be available. Contact us as early as possible if you are unable to attend.

4. Rescheduling

If you need to reschedule rather than cancel, contact us as early as possible at yb@whybeigh.com. Rescheduling is subject to facilitator availability and programme arrangements. A rescheduling request is not the same as a cancellation or refund request unless both parties agree otherwise.

5. Technical Issues

If a material technical problem on Why Beigh's side prevents a session from being delivered, we will offer a reschedule or, where appropriate, a refund. Minor technical interruptions that do not prevent session delivery are not grounds for a refund.

6. Payments

Payments are processed through Razorpay. Refunds are returned to the original payment method and may take 5-10 business days to appear, depending on your bank or payment provider.

7. Programme-Specific Terms

Some programmes (workshops, multi-session packages, or group sessions) may have specific cancellation windows or terms communicated at the time of booking. Those terms apply in addition to this policy.

8. Contact

For refund and cancellation requests: yb@whybeigh.com
For general support: info@whybeigh.com`,
  },
];

async function main() {
  console.log("Seeding static pages...\n");
  let created = 0;
  let updated = 0;

  for (const page of pages) {
    const existing = await prisma.staticPage.findUnique({
      where: { slug: page.slug },
    });

    if (existing) {
      await prisma.staticPage.update({
        where: { slug: page.slug },
        data: { title: page.title, body: page.body, published: page.published },
      });
      console.log(`  Updated (slug existed): /${page.slug}`);
      updated++;
    } else {
      await prisma.staticPage.create({ data: page });
      console.log(`  Created: /${page.slug}`);
      created++;
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
