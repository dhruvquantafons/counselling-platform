"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Faq = { id: string; question: string; answer: string; order: number };

export default function FaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/faqs`)
      .then((r) => r.json())
      .then((d) => setFaqs(d.faqs || []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 md:py-24 animate-page-enter">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-sage-dark transition-colors mb-10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>

      {/* Header */}
      <p className="font-mono text-xs tracking-widest text-sage uppercase mb-3">Support</p>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
        Frequently Asked Questions
      </h1>
      <p className="text-sm text-ink/50 mb-10">
        Parent sessions, student sessions, profile building, career clarity, counselling and education programmes.
      </p>

      <div className="border-t border-sage/10">
        {loading && (
          <div className="py-16 text-center text-sm text-ink/40 animate-pulse">
            Loading…
          </div>
        )}

        {!loading && faqs.length === 0 && (
          <div className="py-16 text-center text-sm text-ink/40">
            No FAQs available yet.
          </div>
        )}

        {!loading && faqs.map((faq) => (
          <div key={faq.id} className="border-b border-sage/10">
            <button
              onClick={() => setOpen(open === faq.id ? null : faq.id)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
            >
              <span className={`text-sm font-semibold leading-snug transition-colors ${open === faq.id ? "text-sage-dark" : "text-ink group-hover:text-sage-dark"}`}>
                {faq.question}
              </span>
              <span className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${open === faq.id ? "border-sage bg-sage text-white" : "border-sage/30 text-ink/40 group-hover:border-sage/60"}`}>
                <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${open === faq.id ? "rotate-45" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </span>
            </button>
            {open === faq.id && (
              <div className="pb-5 text-sm text-ink/65 leading-relaxed animate-fade-in">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact nudge */}
      {!loading && faqs.length > 0 && (
        <div className="mt-12 rounded-2xl bg-sage-light/40 border border-sage/10 px-6 py-5">
          <p className="text-sm font-semibold text-ink mb-1">Still have questions?</p>
          <p className="text-sm text-ink/55">
            Reach us at{" "}
            <a href="mailto:info@whybeigh.com" className="text-sage-dark hover:underline">
              info@whybeigh.com
            </a>
            {" "}or{" "}
            <a href="mailto:yb@whybeigh.com" className="text-sage-dark hover:underline">
              yb@whybeigh.com
            </a>{" "}
            for refund requests.
          </p>
        </div>
      )}
    </main>
  );
}
