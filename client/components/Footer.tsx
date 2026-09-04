"use client";

import Link from "next/link";
import { useState } from "react";

const footerLinks = [
  {
    title: "Platform",
    links: [
      { label: "Find a counsellor", href: "/directory" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Refund & Cancellation Policy", href: "/refund-policy" },
      { label: "Privacy policy", href: "/privacy-policy" },
    ],
  },
  {
    title: "Counsellors",
    links: [
      { label: "Join as counsellor", href: "/join-as-counsellor" },
      { label: "Counsellor guidelines", href: "#guidelines" },
      { label: "Resources", href: "#resources" },
    ],
  },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
      setEmail("");
    }, 600);
  };

  return (
    <footer className="border-t border-sage/10 mt-auto bg-white/60 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 pt-7 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-6">
          {/* Brand + Newsletter */}
          <div className="md:col-span-2 pr-0 md:pr-6">
            <Link href="/" className="flex items-center gap-2 mb-2 group">
              <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center text-white font-display text-xs font-semibold group-hover:rotate-12 transition-transform duration-200">
                W
              </div>
              <span className="font-display text-base text-ink">
                Why<span className="text-sage">beigh</span>
              </span>
            </Link>
            <p className="text-xs text-ink/65 leading-relaxed mb-3">
              A quiet, private place to connect with verified counsellors who actually listen.
            </p>

            {/* Newsletter Subscription */}
            <div className="bg-sage-light/40 border border-sage/15 rounded-xl p-3">
              <p className="text-xs font-semibold text-ink mb-0.5">Stay Mindful</p>
              <p className="text-[11px] text-ink/60 mb-2">
                Weekly mental wellness tips & resources delivered to your inbox.
              </p>

              {subscribed ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-sage-light/80 text-sage-dark text-[11px] font-medium animate-fade-in-up">
                  <svg className="w-3.5 h-3.5 text-sage-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Thank you! You&apos;re subscribed.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-sage/20 focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage text-ink placeholder:text-ink/40 shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="shrink-0 bg-sage-dark text-white hover:bg-sage text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all duration-150 shadow-soft active:scale-95 disabled:opacity-50"
                  >
                    {loading ? "..." : "Subscribe"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Links columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <p className="text-[11px] font-mono text-ink/40 uppercase tracking-widest mb-3">
                {group.title}
              </p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center text-xs text-ink/65 hover:text-sage-dark hover:translate-x-1 transition-all duration-150 gap-1 group"
                    >
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom copyright line */}
        <div className="pt-4 border-t border-sage/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-ink/50">
          <p>© {new Date().getFullYear()} Whybeigh. All rights reserved.</p>
          <p className="text-ink/40">Not a substitute for emergency medical care or crisis support.</p>
        </div>
      </div>
    </footer>
  );
}
