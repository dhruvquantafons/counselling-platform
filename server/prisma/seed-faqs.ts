/**
 * Run with:  npx ts-node prisma/seed-faqs.ts
 * Seeds all FAQs from the Why Beigh FAQ document.
 * Safe to re-run — skips any question that already exists.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const faqs = [
  {
    order: 1,
    question: "What does Why Beigh offer?",
    answer:
      "Why Beigh offers education-focused sessions and programmes for parents and students. These may include parent education sessions, student mentoring, career clarity, profile building, guidance on education choices, workshops, online sessions and offline sessions.",
  },
  {
    order: 2,
    question: "Who can use the services?",
    answer:
      "Parents, students and other learners may participate, subject to the eligibility and arrangements stated for a particular session or programme. Some programmes may have specific age, academic or participation requirements.",
  },
  {
    order: 3,
    question: "Are sessions available online and offline?",
    answer:
      "Yes. Why Beigh may conduct sessions online, offline, one-to-one, in groups, through workshops, or in other formats announced for a particular programme.",
  },
  {
    order: 4,
    question: "Can a parent book a session for a child?",
    answer:
      "Yes. Parents or legal guardians may book sessions for students, particularly where the student is a minor. Parents/guardians are responsible for providing accurate information and appropriate consent.",
  },
  {
    order: 5,
    question: "Can students book sessions themselves?",
    answer:
      "Adult students may book for themselves. For minors, Why Beigh may require a parent or legal guardian to make the booking or provide consent.",
  },
  {
    order: 6,
    question: "What is a career clarity session?",
    answer:
      "It is an educational guidance session intended to help a student understand interests, strengths, options, possible pathways and questions they should explore. It is not a guarantee of a particular career, admission, salary or employment outcome.",
  },
  {
    order: 7,
    question: "What is profile building?",
    answer:
      "Profile-building sessions may help students identify meaningful academic, extracurricular, project, leadership, community, communication and other experiences and present them authentically. The exact scope depends on the programme booked.",
  },
  {
    order: 8,
    question: "Does Why Beigh guarantee admission, a job, scholarship or career success?",
    answer:
      "No. Education and career outcomes depend on many factors outside Why Beigh's control. Guidance is intended to improve clarity, decision-making and preparation, not to guarantee an outcome.",
  },
  {
    order: 9,
    question: "How do I book a session?",
    answer:
      "Use the booking or counselling facility provided on the Why Beigh website/client panel and complete the requested details and payment, where applicable.",
  },
  {
    order: 10,
    question: "How are payments made?",
    answer:
      "Online payments may be processed through Razorpay or another payment method specifically made available by Why Beigh. Payment processing may be subject to the payment provider's terms.",
  },
  {
    order: 11,
    question: "Can I cancel and get a refund?",
    answer:
      "Yes. Why Beigh's standard preference is a full refund for a cancellation request made before the relevant session or service starts. No reason is required. Send the request to yb@whybeigh.com. Please see the separate Refund & Cancellation Policy for details.",
  },
  {
    order: 12,
    question: "Can I reschedule?",
    answer:
      "Rescheduling may be available depending on the programme, facilitator availability and operational arrangements. Contact Why Beigh as early as possible. A rescheduling request is not a substitute for a refund request unless the programme terms say otherwise.",
  },
  {
    order: 13,
    question: "What if I miss my session?",
    answer:
      "A missed session or no-show may not automatically qualify for a new session. Where reasonably possible, contact Why Beigh in advance to request rescheduling. The specific programme terms may apply.",
  },
  {
    order: 14,
    question: "What if there is a technical problem during an online session?",
    answer:
      "If a material technical problem prevents the session from being delivered, Why Beigh may reschedule the session or provide another appropriate remedy depending on the circumstances.",
  },
  {
    order: 15,
    question: "Are sessions recorded?",
    answer:
      "A session will not be treated as recorded unless Why Beigh clearly communicates that recording is being used for the particular programme or obtains appropriate consent where required. Participants should not record, reproduce or distribute sessions without permission.",
  },
  {
    order: 16,
    question: "How is student information handled?",
    answer:
      "Why Beigh may collect information needed to deliver a session, communicate with participants, process payments and improve services. Information relating to minors will be handled with appropriate care and, where applicable, through a parent/guardian. See the Privacy Policy.",
  },
  {
    order: 17,
    question: "Can I share the session material with others?",
    answer:
      "Materials, frameworks, worksheets, recordings and other resources supplied by Why Beigh may be protected by intellectual property rights. Unless permission is given, they should not be copied, commercially reused, publicly distributed or republished.",
  },
  {
    order: 18,
    question:
      "Is Why Beigh a school, university, admission agency or medical/mental-health service?",
    answer:
      "Why Beigh provides education and career guidance services. It does not replace a school, university, licensed professional, medical professional, mental-health professional, lawyer or other regulated professional service where such expertise is required.",
  },
  {
    order: 19,
    question: "How can I contact Why Beigh?",
    answer:
      "For support, privacy or general enquiries, contact info@whybeigh.com. Refund requests should be sent to yb@whybeigh.com.",
  },
];

async function main() {
  console.log("Seeding FAQs…");
  let created = 0;
  let skipped = 0;

  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({
      where: { question: faq.question },
    });
    if (existing) {
      console.log(`  ⟶ Skip (exists): ${faq.question.slice(0, 60)}`);
      skipped++;
    } else {
      await prisma.faq.create({ data: faq });
      console.log(`  ✓ Created: ${faq.question.slice(0, 60)}`);
      created++;
    }
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
