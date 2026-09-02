import Link from "next/link";
import type { Metadata } from "next";
import RevealSection from "@/components/RevealSection";
import TrustBarMarquee from "@/components/TrustBarMarquee";
import AnimatedTags from "@/components/AnimatedTags";

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

        {/* ── Hero image treatment ── */}

        {/* Dot grid behind counsellor */}
        <div
          className="hidden md:block absolute pointer-events-none"
          style={{
            right: "3%",
            top: "10%",
            width: "400px",
            height: "460px",
            backgroundImage: "radial-gradient(circle, rgba(74,99,85,0.15) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            zIndex: 0,
            WebkitMaskImage: "radial-gradient(ellipse 70% 75% at 55% 48%, black 20%, transparent 75%)",
            maskImage: "radial-gradient(ellipse 70% 75% at 55% 48%, black 20%, transparent 75%)",
          }}
        />

        {/* Studio background recreation — warm beige oval matching reference */}
        <div
          className="hidden md:block absolute pointer-events-none"
          style={{
            right: "8%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "500px",
            height: "520px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 50% 45%, #e8e3d8 0%, #e4dfd4 30%, #ddd8cd 55%, transparent 75%)",
            zIndex: 1,
          }}
        />

        {/* Counsellor image */}
        <img
          src="/hero.png"
          alt="Counsellor"
          aria-hidden="true"
          className="hidden md:block absolute pointer-events-none select-none"
          style={{
            right: "12%",
            bottom: "0",
            height: "90%",
            width: "auto",
            maxWidth: "460px",
            objectFit: "contain",
            objectPosition: "bottom center",
            zIndex: 2,
            WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 15%, black 100%)",
            maskImage: "linear-gradient(to top, transparent 0%, black 15%, black 100%)",
            transform: "rotate(1.5deg)",
            transformOrigin: "bottom center",
          }}
        />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="max-w-xl animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 mb-5 border border-sage/30 rounded-full px-3 py-1 bg-white/60 backdrop-blur-sm shadow-soft animate-float">
              <svg className="w-3 h-3 text-sage" fill="currentColor" viewBox="0 0 24 24">
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
                className="btn-arrow inline-flex items-center justify-center bg-sage-dark text-white px-6 py-3 rounded-full font-medium hover:bg-sage hover:scale-[1.02] hover:shadow-soft active:scale-[0.98] transition-all duration-200 text-sm gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Find a counsellor
                <svg className="arrow-icon w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

          {/* Mobile hero image — shown below text on small screens */}
          <div className="md:hidden mt-8 relative flex justify-center">
            {/* Soft oval behind image */}
            <div
              className="absolute inset-x-0 top-4 bottom-0 mx-auto"
              style={{
                width: "80%",
                borderRadius: "50%",
                background: "radial-gradient(ellipse at 50% 45%, #e8e3d8 0%, #e4dfd4 35%, transparent 72%)",
              }}
            />
            <img
              src="/hero.png"
              alt="Counsellor"
              className="relative z-10 w-64 object-contain"
              style={{
                WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 15%, black 100%)",
                maskImage: "linear-gradient(to top, transparent 0%, black 15%, black 100%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* Trust bar — floating marquee strip */}
      <section className="py-6 px-6">
        <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm border border-sage/10 rounded-2xl shadow-soft py-4">
          <TrustBarMarquee />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 pt-12 md:pt-24 pb-12">
        <RevealSection className="max-w-xl mb-12">
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
        </RevealSection>

        {/* Step cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {steps.map((step, i) => (
            <RevealSection key={step.num} delay={((i + 1) as 1 | 2 | 3 | 4)}>
              <div className="card-hover-premium group relative bg-white/50 rounded-2xl border border-sage/10 p-7 h-full">
                <div className="w-11 h-11 rounded-xl bg-sage-light flex items-center justify-center text-sage-dark mb-6 group-hover:scale-110 transition-transform duration-200">
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
            </RevealSection>
          ))}
        </div>

        {/* Quote banner */}
        <div className="flex justify-center overflow-hidden">
          <div
            className="relative overflow-hidden flex items-center px-8 w-full max-w-2xl animate-float"
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
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-24">
          <RevealSection className="flex items-end justify-between mb-12">
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
              className="btn-arrow hidden md:inline-flex items-center text-sm font-medium text-sage-dark hover:text-sage transition-colors duration-150 group"
            >
              View all
              <svg className="arrow-icon ml-1 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </RevealSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {counsellors.slice(0, 4).map((c: Counsellor, i: number) => (
              <RevealSection key={c.id} delay={((i + 1) as 1 | 2 | 3 | 4)}>
                <Link
                  href={`/directory/${c.id}`}
                  className="card-hover-premium group bg-white rounded-2xl border border-sage/10 p-6 flex flex-col h-full"
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
              </RevealSection>
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
            <RevealSection className="md:w-80 shrink-0">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 leading-snug">
                Ready to take the first step?
              </h2>
              <div className="w-8 h-0.5 bg-white/40 mb-4" />
              <p className="text-white text-sm mb-6 leading-relaxed">
                Browse our directory of verified counsellors and find someone who feels right for you.
              </p>
              <Link
                href="/directory"
                className="btn-arrow inline-flex items-center justify-center bg-white text-sage-dark px-5 py-2.5 rounded-full font-medium hover:bg-white/90 hover:scale-[1.02] hover:shadow-soft active:scale-[0.98] transition-all duration-200 text-sm"
              >
                Find your counsellor
                <svg className="arrow-icon ml-2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </RevealSection>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch bg-white/10" />

            {/* Right — popular areas of support */}
            <div className="flex-1 flex flex-col gap-4">
              <RevealSection>
                <p className="text-white/70 text-sm font-medium mb-4">Popular areas of support</p>
                <AnimatedTags />
                <p className="text-white/40 text-xs mt-3">Whatever you&apos;re going through, you&apos;re not alone.</p>
              </RevealSection>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
