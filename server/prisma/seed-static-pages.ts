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
    body: `How Why Beigh collects, uses, protects and handles personal information

Why Beigh
ALI Jan Shopping Plaza, MA Rd Lalchowk, 3rd Floor, Near Cafe Liberty
Website: whybeigh.com
Contact: info@whybeigh.com

1. About this Policy

This Privacy Policy explains how Why Beigh (“Why Beigh”, “we”, “us” or “our”) handles personal information collected through whybeigh.com, the client/counselling panel, bookings, communications and our online and offline education programmes.

Why Beigh is based in India. Our contact for privacy matters is info@whybeigh.com.

2. Information We May Collect

Depending on the service, we may collect a person's name, age or date of birth, contact details, city/location, academic information, interests, goals, session preferences, information voluntarily shared during counselling or mentoring, and booking or programme details.

For parents/guardians, we may collect information needed to arrange and communicate about a student's participation.

We may receive payment status, transaction reference and related information from payment providers. We do not need to receive or store a user's full card, UPI or banking credentials when payment is processed by the payment provider.

We may also collect technical information such as device/browser information, IP address, website usage information and cookies or similar technologies where used.

3. How We Use Information

We may use information to create and manage bookings; deliver counselling, mentoring, workshops and education sessions; communicate with participants; understand a student's or parent's stated goals; process payments and refunds; provide support; maintain records; improve programmes and website functionality; prevent misuse or fraud; comply with legal obligations; and protect the rights and safety of participants and Why Beigh.

We will not use information for an unrelated purpose where such use would be inconsistent with the purpose for which it was collected, except where permitted or required by applicable law.

4. Children and Minors

Why Beigh may provide services to students who are minors. Where a service involves a minor, we may require involvement, consent or supervision of a parent or legal guardian, particularly for bookings and collection of information.

Parents/guardians should avoid providing unnecessary sensitive information about a child. If you believe information about a minor has been provided improperly, contact us at the email above so that we can review the matter.

5. Sharing of Information

We may share information with service providers that help us operate the website, client panel, communications, payment processing, scheduling, hosting, analytics or programme delivery, only as reasonably necessary for those purposes.

We may also disclose information where required by law, legal process, court or governmental authority, or where reasonably necessary to prevent fraud, security incidents or harm.

We do not sell personal information as a business model.

6. Razorpay and Payments

Payments may be processed through Razorpay. Payment processing is subject to the payment provider's own terms and privacy practices. Why Beigh may receive payment confirmation and transaction-related information necessary to identify a booking and process refunds.

7. Cookies and Analytics

The website may use cookies, logs, analytics or similar technologies to maintain functionality, understand usage and improve the service. Where choices or controls are required by applicable law, appropriate controls will be provided.

8. Data Security

We use reasonable administrative, technical and organisational measures intended to protect personal information against unauthorised access, misuse, alteration, disclosure or loss. No internet-based system can be guaranteed to be completely secure.

9. Data Retention

We retain information for as long as reasonably necessary for the purposes for which it was collected, including service delivery, records, accounting, dispute resolution, security and legal compliance. When information is no longer reasonably required, it may be deleted, anonymised or securely disposed of, subject to applicable law.

10. Your Choices and Requests

You may contact info@whybeigh.com to ask about personal information held by Why Beigh, request correction of inaccurate information, raise a privacy concern, or ask a question about how information is used. We may need to verify identity before acting on a request.

Where a parent or legal guardian is acting on behalf of a minor, we may request reasonable evidence of authority to make the request.

11. Third-Party Services and Links

The website or client panel may contain links to third-party services. Their privacy practices are governed by their own policies. Why Beigh is not responsible for the privacy practices of independent third parties.

12. Changes to this Policy

We may update this Privacy Policy from time to time to reflect changes in our services, technology, legal requirements or practices. The updated version will be posted on the website with a revised date.

13. Contact

Privacy and general enquiries: info@whybeigh.com
Business address: ALI Jan Shopping Plaza, MA Rd Lalchowk, 3rd Floor, Near Cafe Liberty
Website: whybeigh.com`,
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    published: true,
    body: `Terms governing use of Why Beigh's website, counselling, mentoring and education services

Why Beigh
ALI Jan Shopping Plaza, MA Rd Lalchowk, 3rd Floor, Near Cafe Liberty
Website: whybeigh.com
Contact: info@whybeigh.com

1. Acceptance

By accessing whybeigh.com, using the client/counselling panel, booking a session, making a payment or participating in a Why Beigh programme, you agree to these Terms & Conditions and the applicable Privacy Policy and Refund & Cancellation Policy.

If you do not agree, please do not use the service or make a booking.

2. Our Services

Why Beigh provides educational guidance, mentoring, parent sessions, student sessions, career clarity, profile-building support, workshops, counselling-style educational conversations and related online/offline programmes.

The exact scope, duration, format, deliverables and price of a service are determined by the booking or programme description applicable at the time of purchase.

3. Educational and Career Guidance Disclaimer

Why Beigh's services are intended to support learning, reflection, planning and informed decision-making. They are not a guarantee of admission, examination results, scholarship, employment, income, migration outcome, professional licensing or any particular career outcome.

Participants remain responsible for verifying information and making final education and career decisions. Where regulated professional advice is required, participants should consult the appropriate qualified professional.

4. Bookings and Payments

Users must provide accurate and current information when booking. A booking is confirmed only when the required booking steps and payment, where applicable, have been completed.

Prices and programme details may change for future bookings. Changes will not retroactively alter a completed booking except where necessary to correct an obvious error or where otherwise permitted by law.

Payments may be processed through Razorpay. Payment provider terms may also apply.

5. Minors

Why Beigh may serve minors. A parent or legal guardian may be required to make or authorise a booking for a minor. Parents/guardians are responsible for providing accurate information, appropriate consent and reasonable supervision where required.

Why Beigh may decline or pause participation where necessary to protect a minor, comply with law, or obtain required parental/guardian involvement.

6. Participant Conduct

Participants must behave respectfully toward facilitators and other participants. Harassment, threats, abusive conduct, deliberate disruption, impersonation, fraud, unauthorised access, or misuse of the platform or materials is prohibited.

Why Beigh may suspend or end participation where conduct materially interferes with the safety or delivery of a programme.

7. Online Sessions

Participants are responsible for having a suitable device, internet connection and environment unless the programme states otherwise. Online sessions may occasionally be affected by technical, connectivity or platform issues outside Why Beigh's control.

Participants should not share meeting links, access credentials or private session information with unauthorised persons.

8. Offline Sessions

Offline programmes may be held at the stated venue or another location communicated for the programme. Participants should follow reasonable venue, safety and scheduling instructions.

9. Intellectual Property

Unless expressly stated otherwise, Why Beigh owns or has permission to use the website content, frameworks, written materials, worksheets, presentations, branding and other programme materials.

Users may use materials for their own personal educational purposes but may not copy, resell, publish, commercially exploit, distribute or create a competing product from them without written permission.

10. Confidentiality and Session Information

Participants should share only information necessary for the service. Why Beigh will handle personal information according to its Privacy Policy.

Participants must respect the privacy of other participants and must not publish or distribute another person's personal information, statements, photographs, recordings or session content without appropriate permission.

11. Third-Party Services

Why Beigh may use third-party tools or services such as payment processors, video-conferencing platforms, hosting providers and scheduling tools. Their own terms may apply to the relevant part of the service.

12. Cancellations and Refunds

Refunds are governed by the separate Refund & Cancellation Policy. The standard policy is a full refund for an eligible cancellation request made before the relevant session or service starts, with no reason required, by emailing yb@whybeigh.com.

13. Limitation of Liability

To the extent permitted by applicable law, Why Beigh is not responsible for indirect, incidental, special or consequential loss arising from reliance on educational or career guidance, technical interruptions, third-party services, or outcomes that depend on decisions or circumstances outside Why Beigh's control.

Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited under applicable Indian law.

14. Force Majeure

Why Beigh will not be responsible for delay or inability to deliver a service caused by circumstances reasonably beyond its control, including major technical failures, internet or platform outages, natural events, government restrictions, emergencies or other comparable events. Where practical, an affected session may be rescheduled or an appropriate remedy offered.

15. Changes and Termination

Why Beigh may update these Terms and may modify, suspend or discontinue a programme or part of the website where reasonably necessary. Updated terms will be published or otherwise communicated as appropriate.

If a user materially breaches these Terms, Why Beigh may suspend or terminate access to the relevant service.

16. Governing Law

These Terms are governed by the laws of India. Any dispute will be handled in accordance with applicable Indian law and the jurisdiction of competent courts.

17. Contact

info@whybeigh.com
ALI Jan Shopping Plaza, MA Rd Lalchowk, 3rd Floor, Near Cafe Liberty
whybeigh.com`,
  },
  {
    slug: "refund-policy",
    title: "Refund & Cancellation Policy",
    published: true,
    body: `Simple cancellation and refund rules for Why Beigh's online and offline services

Why Beigh
ALI Jan Shopping Plaza, MA Rd Lalchowk, 3rd Floor, Near Cafe Liberty
Website: whybeigh.com
Contact: info@whybeigh.com

1. Our Refund Promise

Why Beigh's standard policy is simple: if you decide to cancel an eligible booking before the relevant session or service starts, you may request a full refund. No reason is required.

Send the cancellation/refund request by email to yb@whybeigh.com using the email address associated with the booking where possible.

2. What This Covers

This policy applies to eligible paid Why Beigh services, including online and offline one-to-one sessions, parent sessions, student sessions, career clarity sessions, profile-building sessions, workshops and other counselling/education programmes, unless the specific programme page or booking terms clearly state a different refund arrangement.

3. How to Request a Refund

Email yb@whybeigh.com with the participant's name, booking details and the request for cancellation/refund. You do not need to explain why you are cancelling.

A refund request should be made before the scheduled session or service begins to qualify under the standard full-refund rule.

4. Refund Amount

For an eligible cancellation made before the service starts: 100% of the amount paid to Why Beigh for that booking is refundable.

For a package or multi-session programme, if the programme has already started, the refund will generally relate only to the eligible unused portion, where a refund is available under the programme terms. Any non-refundable third-party charge, if clearly disclosed in advance and permitted by applicable law, may be treated separately.

5. After a Session or Service Has Started

Once a one-to-one session, workshop, programme or other service has started, the standard full-refund rule does not automatically apply to that completed or delivered portion.

If a service is partially delivered, Why Beigh may assess the refundable amount based on the unused portion and the specific programme terms.

6. No-Show

If a participant does not attend a scheduled session without cancelling in advance, a refund is not automatically guaranteed. Where reasonably possible, contact Why Beigh before the session to request cancellation or rescheduling.

7. Rescheduling

A participant may request rescheduling where the programme allows it. Rescheduling depends on facilitator and programme availability and should be requested as early as possible.

Where a participant chooses rescheduling instead of cancellation, the refund request may be treated according to the applicable booking terms.

8. If Why Beigh Cancels

If Why Beigh cancels a paid session or programme and cannot provide a suitable rescheduled session or alternative arrangement, the participant will generally be offered a full refund for the affected paid service.

9. Technical Problems

If a material technical problem on the Why Beigh side prevents an online session from being meaningfully delivered, Why Beigh may reschedule the session or provide an appropriate refund/remedy depending on the circumstances.

10. Refund Processing

Approved refunds will normally be initiated to the original payment method where the payment system permits. The time for the funds to appear may depend on Razorpay, banks, card networks, UPI providers or other payment intermediaries and may be outside Why Beigh's control.

11. Important Note

Nothing in this policy is intended to remove or restrict any consumer right or other legal right that cannot lawfully be excluded under applicable Indian law.

12. Contact

Refund/cancellation email: yb@whybeigh.com
General/support email: info@whybeigh.com
Business address: ALI Jan Shopping Plaza, MA Rd Lalchowk, 3rd Floor, Near Cafe Liberty
Website: whybeigh.com`,
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
