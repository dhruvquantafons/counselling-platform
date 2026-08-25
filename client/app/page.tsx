import Link from "next/link";

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
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sage-light/60 via-paper to-paper" />
        {/* Subtle decorative dots */}
        <div className="absolute top-16 right-[15%] w-2 h-2 rounded-full bg-sage/20 animate-pulse-soft" />
        <div className="absolute top-32 right-[25%] w-1.5 h-1.5 rounded-full bg-amber/20 animate-pulse-soft stagger-2" />
        <div className="absolute bottom-24 left-[10%] w-2 h-2 rounded-full bg-sage/15 animate-pulse-soft stagger-4" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-32">
          <div className="max-w-2xl animate-fade-in-up">
            <p className="font-mono text-xs tracking-wide text-sage uppercase mb-4">
              Online counselling, reimagined
            </p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.1] mb-6 text-ink">
              Talk to someone who{" "}
              <span className="relative inline-block">
                <span className="relative z-10">actually</span>
                <span className="absolute bottom-2 left-0 right-0 h-3 bg-amber-light -z-0 rounded-full" />
              </span>{" "}
              listens.
            </h1>
            <p className="text-lg md:text-xl text-ink/60 mb-8 leading-relaxed max-w-xl">
              Verified counsellors, transparent fees, and private video sessions.
              Because getting help should feel as normal as booking a doctor&apos;s
              appointment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/directory"
                className="inline-flex items-center justify-center bg-sage text-white px-7 py-3.5 rounded-full font-medium hover:bg-sage-dark transition-colors text-sm active:scale-[0.97]"
              >
                Find a counsellor
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
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center border border-sage/25 text-ink px-7 py-3.5 rounded-full font-medium hover:bg-sage-light/60 transition-colors text-sm"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-sage/10 bg-white/60">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-ink/50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Licensed professionals</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.515 11.515 0 0010 1.944 11.515 11.515 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Secure payments</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>Flexible scheduling</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>100% private</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-xl mb-16">
          <p className="font-mono text-xs tracking-wide text-sage uppercase mb-3">
            How it works
          </p>
          <h2 className="font-display text-3xl md:text-4xl mb-4 text-ink">
            Three steps to a calmer mind.
          </h2>
          <p className="text-ink/60 text-lg">
            We removed the friction so you can focus on what matters — feeling
            better.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`card-hover group relative bg-white rounded-2xl border border-sage/10 p-8 animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="w-11 h-11 rounded-xl bg-sage-light flex items-center justify-center text-sage-dark mb-5">
                {step.icon}
              </div>
              <p className="font-mono text-xs text-ink/30 mb-2">{step.num}</p>
              <h3 className="font-display text-xl mb-3 text-ink">
                {step.title}
              </h3>
              <p className="text-sm text-ink/60 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
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
              className="hidden md:inline-flex items-center text-sm font-medium text-sage-dark hover:text-sage transition-colors"
            >
              View all
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                  <span className="text-xs text-amber font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View profile →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/directory"
              className="inline-flex items-center text-sm font-medium text-sage-dark"
            >
              View all counsellors
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="relative bg-ink rounded-3xl overflow-hidden px-8 py-16 md:px-16 md:py-20 text-center">
          <div className="absolute inset-0 -z-0 opacity-15">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-sage rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Ready to take the first step?
            </h2>
            <p className="text-white/60 max-w-xl mx-auto mb-8 text-lg">
              Browse our directory of verified counsellors and find someone who
              feels right for you.
            </p>
            <Link
              href="/directory"
              className="inline-flex items-center justify-center bg-white text-ink px-7 py-3.5 rounded-full font-medium hover:bg-sage-light transition-colors text-sm active:scale-[0.97]"
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
        </div>
      </section>
    </div>
  );
}
