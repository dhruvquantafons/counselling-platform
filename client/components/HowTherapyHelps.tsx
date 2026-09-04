import RevealSection from "@/components/RevealSection";
import Link from "next/link";

export default function HowTherapyHelps() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-paper via-sage-light/10 to-paper" />
      <div
        className="absolute inset-0 -z-10 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(184,128,74,0.10) 0, transparent 40%), radial-gradient(circle at 10% 85%, rgba(74,99,85,0.10) 0, transparent 40%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left — Floating Illustration */}
          <div className="relative mx-auto max-w-lg w-full aspect-square -translate-x-14">
            {/* Soft bokeh glow behind illustration */}
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-75 -z-10 animate-pulse-slow"
              style={{
                background:
                  "radial-gradient(circle at 50% 55%, rgba(227,233,225,0.95) 0%, rgba(240,226,210,0.7) 45%, transparent 75%)",
              }}
            />

            <div className="absolute inset-0 animate-float-hero flex items-center justify-center">
              <img
                src="/therapyy.png"
                alt="Counsellor supporting a client in a therapy session"
                className="w-[115%] h-[115%] object-contain drop-shadow-soft-lg"
              />
            </div>
          </div>

          {/* Right — Copy + CTA */}
          <RevealSection delay={2}>
            <p className="font-mono text-xs tracking-widest text-sage uppercase mb-3">
              What you actually get
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-5 leading-tight">
              How Online Therapy Helps
            </h2>

            {/* Quick Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-light/60 text-sage-dark text-xs font-medium border border-sage/20">
                <svg className="w-3.5 h-3.5 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                100% Confidential
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber/10 text-amber-900 text-xs font-medium border border-amber/20">
                <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verified Therapists
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-ink/80 text-xs font-medium border border-ink/10 shadow-xs">
                <svg className="w-3.5 h-3.5 text-sage" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Flexible Scheduling
              </span>
            </div>

            {/* Benefit Bullet Cards */}
            <div className="space-y-4 mb-7">
              <div className="flex gap-3.5 p-3.5 rounded-xl bg-white/70 border border-sage/15 shadow-soft hover:shadow-md transition-all duration-200">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-sage-light/70 text-sage-dark flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-1">A Confidential Space of Your Own</h3>
                  <p className="text-xs text-ink/70 leading-relaxed">
                    No interruptions, no judgment, and no explaining yourself twice. Feel heard in a private, encrypted environment.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 p-3.5 rounded-xl bg-white/70 border border-sage/15 shadow-soft hover:shadow-md transition-all duration-200">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-amber-light/60 text-amber-900 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-1">Uncover Hidden Thinking Patterns</h3>
                  <p className="text-xs text-ink/70 leading-relaxed">
                    Identify repeating thoughts and emotional triggers with a trained counsellor guiding you every step of the way.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 p-3.5 rounded-xl bg-white/70 border border-sage/15 shadow-soft hover:shadow-md transition-all duration-200">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-sage-light/70 text-sage-dark flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-1">Actionable Everyday Toolkit</h3>
                  <p className="text-xs text-ink/70 leading-relaxed">
                    Walk away with practical tools for healthier relationships, work anxiety, and self-compassion.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/directory"
                className="btn-arrow inline-flex items-center justify-center bg-sage-dark text-white px-6 py-3 rounded-full font-medium hover:bg-sage hover:scale-[1.02] hover:shadow-soft active:scale-[0.98] transition-all duration-200 text-sm gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
                Start Therapy
                <svg
                  className="arrow-icon w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>

            </div>
          </RevealSection>
        </div>
      </div>
    </section>
  );
}
