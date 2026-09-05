"use client";

import React, { useState } from "react";
import RevealSection from "./RevealSection";

type FAQItem = {
  id: string;
  category: "booking" | "privacy" | "verification" | "pricing";
  question: string;
  answer: string;
};

const faqs: FAQItem[] = [
  {
    id: "faq-1",
    category: "privacy",
    question: "Are video sessions completely private and encrypted?",
    answer:
      "Yes. Every video session is end-to-end encrypted using WebRTC security protocols. We do not store, record, or monitor any session audio or video. Your privacy and confidentiality are our highest priorities.",
  },
  {
    id: "faq-2",
    category: "verification",
    question: "How are counsellors on Whybeigh verified?",
    answer:
      "All counsellors undergo a rigorous 4-step verification process: official government ID check, verified master's degree or clinical qualification in Psychology/Counselling, background check, and an interactive clinical assessment interview.",
  },
  {
    id: "faq-3",
    category: "booking",
    question: "How do I choose the right therapist for my needs?",
    answer:
      "You can filter our directory by specialisations (anxiety, relationships, career stress, self-esteem, grief), spoken languages (Hindi, English, Tamil, Bengali, etc.), and fee ranges. Each therapist's profile features verified badges, qualifications, and areas of focus.",
  },
  {
    id: "faq-4",
    category: "booking",
    question: "Do I need to download any software or app for sessions?",
    answer:
      "No downloads are required. Once you book, you receive a secure link via email and SMS. On your appointment time, simply click the link from your phone, laptop, or tablet browser to join the video room directly.",
  },
  {
    id: "faq-5",
    category: "pricing",
    question: "What are the session fees and payment options?",
    answer:
      "Session fees are set transparently by each counsellor, starting from ₹499 per 45-minute session. We accept all major Indian payment methods including UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and NetBanking.",
  },
  {
    id: "faq-6",
    category: "booking",
    question: "What if I need to reschedule or cancel my appointment?",
    answer:
      "You can reschedule or cancel your session up to 6 hours before the scheduled time free of charge directly through your booking confirmation link or account dashboard.",
  },
];

const categories = [
  { id: "all", label: "All Questions" },
  { id: "privacy", label: "Privacy & Confidentiality" },
  { id: "verification", label: "Counsellor Verification" },
  { id: "booking", label: "Booking & Sessions" },
  { id: "pricing", label: "Fees & Payment" },
];

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>("faq-1");

  const filteredFaqs =
    activeCategory === "all"
      ? faqs
      : faqs.filter((faq) => faq.category === activeCategory);

  const toggleFAQ = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-16 md:py-24 bg-paper/60 border-t border-sage/10 relative overflow-hidden">
      {/* Soft background decor */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-72 bg-sage/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-amber-light/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <RevealSection className="text-center mb-10">
          <span className="font-mono text-xs tracking-widest text-sage uppercase font-medium">
            Got Questions?
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mt-2 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-ink/65 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Everything you need to know about starting online counselling, privacy, and finding the right support.
          </p>
        </RevealSection>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-sage-dark text-white shadow-soft scale-[1.02]"
                    : "bg-white/80 text-ink/70 hover:bg-white border border-sage/15 hover:text-ink"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white/80 backdrop-blur-sm ${
                  isOpen
                    ? "border-sage/40 shadow-soft bg-white"
                    : "border-sage/15 hover:border-sage/30"
                }`}
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-display font-semibold text-base md:text-lg text-ink">
                    {faq.question}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? "bg-sage-dark text-white rotate-180"
                        : "bg-sage-light/60 text-sage-dark"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-ink/75 leading-relaxed border-t border-sage/10 animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support CTA */}
        <div className="mt-12 text-center bg-white/60 border border-sage/15 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <p className="font-display font-medium text-ink text-base mb-1">
            Have a question that isn&apos;t listed here?
          </p>
          <p className="text-xs md:text-sm text-ink/60 mb-4">
            Our care support team is available 7 days a week to help you get started.
          </p>
          <a
            href="mailto:support@whybeigh.com"
            className="inline-flex items-center gap-2 bg-sage-light text-sage-dark px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-sage/20 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            Contact Care Support
          </a>
        </div>
      </div>
    </section>
  );
}
