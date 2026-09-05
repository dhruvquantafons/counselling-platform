import Link from "next/link";
import type { Metadata } from "next";
import RevealSection from "@/components/RevealSection";
import TrustBarMarquee from "@/components/TrustBarMarquee";
import AnimatedTags from "@/components/AnimatedTags";
import VerifiedBadge, {
  type VerifiedBadgeType,
} from "@/components/VerifiedBadge";
import Testimonials from "@/components/Testimonials";
import HowTherapyHelps from "@/components/HowTherapyHelps";
import TherapyImprovesCarousel from "@/components/TherapyImprovesCarousel";
import HeroBackgroundVideo from "@/components/HeroBackgroundVideo";

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

const badgeSets: Record<string, VerifiedBadgeType[]> = {
  default: ["identity", "degree"],
  senior: ["license", "sessions", "background"],
  multilingual: ["identity", "languages", "degree"],
};

function pickBadges(c: Counsellor, index: number): VerifiedBadgeType[] {
  if (index === 0) return badgeSets.senior;
  if (index === 1) return badgeSets.multilingual;
  if (index === 2) return badgeSets.default;
  return ["identity", "degree", "background"];
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
      <section className="relative overflow-hidden min-h-[560px] md:min-h-[620px] flex items-center">
        {/* Background Video — continuous video of a person reading a book */}
        <HeroBackgroundVideo />

        {/* Seamless full-screen gradient overlay — zero double shade split lines */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-paper/90 via-paper/60 to-paper/20 w-full h-full pointer-events-none" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-paper/40 via-transparent to-paper w-full h-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20 w-full relative z-10">
          <div className="max-w-xl animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 mb-5 border border-sage/30 rounded-full px-3.5 py-1.5 bg-white/80 backdrop-blur-md shadow-soft animate-float">
              <svg className="w-3 h-3 text-sage" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 19.87L5.71 21l1-1.9A4.49 4.49 0 008 20C10.24 20 12 18.24 12 16a4 4 0 00-4-4 3.69 3.69 0 00-1 .15C8.34 10.85 10.7 9.11 17 8z"/>
              </svg>
              <p className="font-mono text-xs tracking-widest text-sage uppercase font-medium">
                Online counselling, reimagined
              </p>
            </div>

            {/* Heading */}
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] mb-4 text-ink">
              Talk to someone who{" "}
              <span className="relative inline-block">
                <span className="relative z-10">actually</span>
                <span className="absolute bottom-1 left-0 right-0 h-2 bg-amber-light -z-0 rounded-full" />
              </span>{" "}
              listens.
            </h1>

            {/* Subtext */}
            <p className="text-base md:text-lg text-ink/80 mb-8 leading-relaxed max-w-md font-normal">
              Verified counsellors, transparent fees, and private
              video sessions. Because getting help should feel
              as normal as booking a doctor&apos;s appointment.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/directory"
                className="btn-arrow inline-flex items-center justify-center bg-sage-dark text-white px-6 py-3 rounded-full font-medium hover:bg-sage hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all duration-200 text-sm gap-2"
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
                className="inline-flex items-center justify-center border border-ink/20 text-ink bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full font-medium hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 text-sm gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 000-1.69L9.54 5.98A.998.998 0 008 6.82z"/>
                </svg>
                How it works
              </Link>
            </div>
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

      {/* How Therapy Helps */}
      <HowTherapyHelps />

      {/* What Improves With Therapy */}
      <section className="bg-sage-light/30 border-y border-sage/10 overflow-hidden">
        <div className="max-w-6xl mx-auto px-8 md:px-14 py-12 md:py-20">
          {/* Header */}
          <RevealSection className="text-center mb-10">
            <p className="font-mono text-xs tracking-widest text-sage uppercase mb-3">
              Areas we help with
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink leading-tight">
              What Improves With Therapy
            </h2>
            <p className="mt-3 text-sm text-ink/60 max-w-xl mx-auto">
              Therapy isn&apos;t a last resort — it&apos;s a skill. Here&apos;s what thousands of our clients have seen transform in their lives.
            </p>
          </RevealSection>

          {/* Carousel — client component (needs onClick) */}
          <TherapyImprovesCarousel />
        </div>
      </section>


      {/* Testimonials */}
      <Testimonials />

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
