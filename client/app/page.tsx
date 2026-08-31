import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whybeigh — Online Counselling in India",
  description:
    "Find and book a verified counsellor online. Choose by specialisation, language, and fee — then join a private video session from wherever you are.",
  openGraph: {
    title: "Whybeigh — Online Counselling in India",
    description:
      "Find and book a verified counsellor online. Choose by specialisation, language, and fee — then join a private video session from wherever you are.",
    url: "/",
    type: "website",
  },
  twitter: {
    title: "Whybeigh — Online Counselling in India",
    description:
      "Find and book a verified counsellor online. Choose by specialisation, language, and fee — then join a private video session from wherever you are.",
  },
};

type Counsellor = {
  id: string;
  name: string;
  specialisation: string;
  languages: string[];
  fee: number;
};

async function getCounsellors(): Promise<Counsellor[]> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${apiBase}/api/counsellors`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return [];
    return await res.json();
  } catch {
    return [];
  }
}

const steps = [
  {
    num: "01",
    title: "Choose a counsellor",
    description:
      "Browse by specialisation, language, or fee. Read bios and see availability at a glance.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Book and pay",
    description:
      "Enter your details, pick a time slot, and pay securely online. Your seat is held for 10 minutes.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Join your session",
    description:
      "Meet your counsellor in a private video room. No downloads, no logins beyond your booking.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
];

export default async function Home() {
  const counsellors = await getCounsellors();

  return (
    <main className="animate-page-enter">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sage-light/40 via-paper to-paper" />
        {/* Scattered dots */}
        <div className="absolute top-20 right-[38%] w-1.5 h-1.5 rounded-full bg-sage/20" />
        <div className="absolute top-40 right-[42%] w-1 h-1 rounded-full bg-sage/15" />
        <div className="absolute top-56 right-[35%] w-1.5 h-1.5 rounded-full bg-sage/20" />
        <div className="absolute bottom-32 right-[44%] w-1 h-1 rounded-full bg-sage/15" />

        {/* hero.png — right side, natural size, vertically centered */}
        <img
          src="/hero.png"
          alt=""
          aria-hidden="true"
          className="absolute right-36 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden md:block"
          style={{ width: "319px", height: "402px", objectFit: "contain" }}
        />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="max-w-xl animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 mb-5">
              <svg className="w-3.5 h-3.5 text-sage" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 19.87L5.71 21l1-1.9A4.49 4.49 0 008 20C10.24 20 12 18.24 12 16a4 4 0 00-4-4 3.69 3.69 0 00-1 .15C8.34 10.85 10.7 9.11 17 8z"/>
              </svg>
              <p className="font-mono text-xs tracking-widest text-sage uppercase">
                Online counselling, reimagined
              </p>
            </div>

            {/* Heading */}
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] mb-3 text-ink">
              Talk to someone who{" "}
              <span className="relative inline-block">
                <span className="relative z-10">actually</span>
                <span className="absolute bottom-1 left-0 right-0 h-2 bg-amber-light -z-0 rounded-full" />
              </span>{" "}
              listens.
            </h1>

            {/* Subtext */}
            <p className="text-base text-ink/70 mb-8 leading-relaxed max-w-md">
              Verified counsellors, transparent fees, and private
              video sessions. Because getting help should feel
              as normal as booking a doctor&apos;s appointment.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/directory"
                className="inline-flex items-center justify-center bg-sage-dark text-white px-6 py-3 rounded-full font-medium hover:bg-sage hover:scale-[1.02] hover:shadow-soft active:scale-[0.98] transition-all duration-150 text-sm gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Find a counsellor
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center border border-ink/20 text-ink bg-white/60 px-6 py-3 rounded-full font-medium hover:bg-sage-light/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 text-sm gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 000-1.69L9.54 5.98A.998.998 0 008 6.82z"/>
                </svg>
                How it works
              </Link>
            </div>

            {/* CTAs end */}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-sage/10 bg-white/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink leading-tight">Verified professionals</p>
                <p className="text-xs text-ink/45 mt-0.5 leading-snug">All counsellors are screened &amp; verified</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink leading-tight">Private &amp; secure</p>
                <p className="text-xs text-ink/45 mt-0.5 leading-snug">Your sessions &amp; data are always protected</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink leading-tight">Transparent pricing</p>
                <p className="text-xs text-ink/45 mt-0.5 leading-snug">Clear fees, no hidden charges</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink leading-tight">Flexible scheduling</p>
                <p className="text-xs text-ink/45 mt-0.5 leading-snug">Book a time that works for you</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <div className="max-w-xl mb-12">
          <p className="font-mono text-xs tracking-widest text-sage uppercase mb-3">
            How it works
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-ink">
            Three steps to a calmer mind.
          </h2>
          <p className="text-ink/70 text-base leading-relaxed">
            We removed the friction so you can focus on what matters —{" "}
            feeling better.
          </p>
        </div>

        {/* Step cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`group relative bg-white/50 rounded-2xl border border-sage/10 p-7 animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="w-11 h-11 rounded-xl bg-sage-light flex items-center justify-center text-sage-dark mb-6">
                {step.icon}
              </div>
              <p className="font-mono text-xs text-ink/30 mb-1.5">{step.num}</p>
              <h3 className="font-display text-lg font-bold mb-2.5 text-ink">
                {step.title}
              </h3>
              <p className="text-sm text-ink/55 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quote banner */}
        <div className="flex justify-center">
          <div
            className="relative overflow-hidden flex items-center px-8 w-full max-w-2xl"
            style={{
              backgroundImage: "url('/leaf.png')",
              backgroundRepeat: "no-repeat",
              backgroundSize: "100% 100%",
              height: "80px",
              borderRadius: "16px",
            }}
          >
            <div className="z-10" style={{ paddingLeft: "10%" }}>
              <p className="text-sm text-ink/65">We believe asking for help is a sign of strength.</p>
              <p className="text-sm font-bold text-ink/80">We&apos;re here to walk with you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured counsellors */}
      <section className="bg-sage-light/30 border-y border-sage/10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-mono text-xs tracking-wide text-sage uppercase mb-3">
                Featured counsellors
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-ink">
                Start with someone you trust.
              </h2>
            </div>
            <Link
              href="/directory"
              className="hidden md:inline-flex items-center text-sm font-medium text-sage-dark hover:text-sage transition-colors duration-150 group"
            >
              View all
              <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {counsellors.slice(0, 4).map((c: Counsellor, i: number) => (
              <Link
                key={c.id}
                href={`/directory/${c.id}`}
                className={`card-hover group bg-white rounded-2xl border border-sage/10 p-6 flex flex-col animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center font-display text-lg text-sage-dark mb-4 ring-2 ring-sage/10 group-hover:ring-sage/25 transition-all">
                  {c.name
                    .split(" ")
                    .filter((w: string) => w[0] === w[0].toUpperCase() && w !== "Dr.")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <h3 className="font-display text-lg mb-1 text-ink group-hover:text-sage-dark transition-colors">
                  {c.name}
                </h3>
                <p className="text-sm text-ink/60 mb-4 line-clamp-2">
                  {c.specialisation} · {c.languages.join(", ")}
                </p>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-sage/10">
                  <p className="font-mono text-base text-sage-dark">
                    ₹{c.fee}
                    <span className="text-ink/40 text-xs font-normal ml-1">
                      / session
                    </span>
                  </p>
                  <span className="text-xs text-amber font-medium opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150">
                    View profile →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/directory"
              className="inline-flex items-center text-sm font-medium text-sage-dark hover:text-sage transition-colors duration-150 group"
            >
              View all counsellors
              <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sage-dark py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          {/* Leaf / bokeh decoration */}
          <div className="absolute inset-0 -z-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-sage rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber rounded-full blur-3xl" />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center gap-10 md:gap-16">
            {/* Left — headline + cta */}
            <div className="md:w-80 shrink-0">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 leading-snug">
                Ready to take the first step?
              </h2>
              {/* short underline accent */}
              <div className="w-8 h-0.5 bg-white/40 mb-4" />
              <p className="text-white text-sm mb-6 leading-relaxed">
                Browse our directory of verified counsellors and find someone who feels right for you.
              </p>
              <Link
                href="/directory"
                className="inline-flex items-center justify-center bg-white text-sage-dark px-5 py-2.5 rounded-full font-medium hover:bg-white/90 hover:scale-[1.02] hover:shadow-soft active:scale-[0.98] transition-all duration-150 text-sm"
              >
                Find your counsellor
                <svg
                  className="ml-2 w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-white/10" />

            {/* Right — popular areas of support */}
            <div className="flex-1 flex flex-col gap-4">
              <p className="text-white/70 text-sm font-medium">Popular areas of support</p>
              <div className="flex flex-wrap gap-2.5">
                {/* Anxiety */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  Anxiety
                </div>
                {/* Stress */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
                  Stress
                </div>
                {/* Relationships */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  Relationships
                </div>
                {/* Depression */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>
                  Depression
                </div>
                {/* Self-esteem */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  Self-esteem
                </div>
                {/* Career */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Career
                </div>
                {/* Grief */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                  Grief
                </div>
                {/* More */}
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-xl px-4 py-2 text-white/90 text-sm hover:bg-white/10 transition-colors cursor-default">
                  <span className="tracking-widest text-white/60 text-xs">•••</span>
                  More
                </div>
              </div>
              <p className="text-white/40 text-xs mt-1">Whatever you&apos;re going through, you&apos;re not alone.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
