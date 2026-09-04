import RevealSection from "@/components/RevealSection";

type Testimonial = {
  id: string;
  name: string;
  city: string;
  concern: string;
  rating: number;
  quote: string;
  sessionsCompleted: number;
  accent: "sage" | "amber" | "rose" | "sky";
};

const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Ananya S.",
    city: "Bengaluru",
    concern: "Anxiety & work stress",
    rating: 5,
    sessionsCompleted: 8,
    accent: "sage",
    quote:
      "I was terrified of my first session. My counsellor made me feel safe within three minutes. Six weeks later, I finally stopped dreading Monday mornings.",
  },
  {
    id: "t2",
    name: "Rohan M.",
    city: "Mumbai",
    concern: "Relationships",
    rating: 5,
    sessionsCompleted: 4,
    accent: "amber",
    quote:
      "Booking, paying, joining — everything was simpler than I expected. And actually getting to choose a counsellor who speaks my language? Game changer.",
  },
  {
    id: "t3",
    name: "Priya K.",
    city: "Pune",
    concern: "Depression & mood",
    rating: 5,
    sessionsCompleted: 12,
    accent: "rose",
    quote:
      "For years I thought therapy wasn't 'for people like me'. The notes I took in sessions are now the notes I live by. Worth every rupee.",
  },
  {
    id: "t4",
    name: "Arjun T.",
    city: "Delhi",
    concern: "Grief & loss",
    rating: 5,
    sessionsCompleted: 6,
    accent: "sky",
    quote:
      "I tried talking to friends first — it left me feeling like a burden. Here, I had someone trained to listen. I didn't realise how much I needed that.",
  },
];

const avatarAccents: Record<Testimonial["accent"], string> = {
  sage: "from-sage to-sage-dark",
  amber: "from-amber to-amber-light via-amber",
  rose: "from-rose-500 to-rose-400",
  sky: "from-sky-600 to-sky-400",
};

const cardAccents: Record<Testimonial["accent"], string> = {
  sage: "border-sage/15 before:from-sage/10",
  amber: "border-amber/20 before:from-amber/10",
  rose: "border-rose-200/40 before:from-rose-200/20",
  sky: "border-sky-200/40 before:from-sky-200/20",
};

const chipAccents: Record<Testimonial["accent"], string> = {
  sage: "bg-sage-light text-sage-dark border-sage/20",
  amber: "bg-amber-light text-amber border-amber/30",
  rose: "bg-rose-50 text-rose-600 border-rose-200/60",
  sky: "bg-sky-50 text-sky-700 border-sky-200/60",
};

function GoogleRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Google "G" mark */}
      <svg
        viewBox="0 0 48 48"
        className="w-4 h-4 shrink-0"
        aria-label="Google review"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      {/* 5 Gold stars */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`w-3.5 h-3.5 text-amber ${
              i < count ? "opacity-100" : "opacity-15"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.962a1 1 0 00.95.69h4.17c.969 0 1.371 1.24.588 1.81l-3.376 2.455a1 1 0 00-.364 1.118l1.287 3.962c.3.921-.755 1.688-1.54 1.118l-3.375-2.455a1 1 0 00-1.175 0l-3.375 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.962a1 1 0 00-.364-1.118L2.049 9.39c-.783-.57-.38-1.81.588-1.81h4.17a1 1 0 00.95-.69l1.286-3.963z" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ t }: { t: Testimonial }) {
  return (
    <div
      className={`relative shrink-0 w-[340px] sm:w-[380px] md:w-[420px] overflow-hidden rounded-3xl border p-7 bg-white/80 backdrop-blur-sm ${cardAccents[t.accent]} before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:via-transparent before:to-transparent before:-z-10`}
    >
      <svg
        className="absolute top-5 right-6 w-10 h-10 text-sage/10"
        fill="currentColor"
        viewBox="0 0 132 132"
        aria-hidden="true"
      >
        <path d="M41.72 57.76c-5.92-6.2-13.88-9.4-23.72-9.4-1.12 0-2.28.04-3.44.08C15.84 63.2 14.12 72.64 14 79.16c-.12 6.52 1.48 11.48 4.64 15.04 3.16 3.48 7.56 5.36 13.04 5.36 5.76 0 10.24-1.92 13.32-5.88 3.08-4 4.68-9.32 4.64-16.04-.04-6.16-1.48-11.48-4.24-15.96h-.68zm72.4-9.4c-1.12 0-2.28.04-3.44.08-1.28 5.64-3 15.08-3.12 21.6-.12 6.52 1.48 11.48 4.64 15.04 3.16 3.48 7.56 5.36 13.04 5.36 5.76 0 10.24-1.92 13.32-5.88 3.08-4 4.68-9.32 4.64-16.04-.04-6.16-1.48-11.48-4.24-15.96h-.68c-5.92-6.2-13.88-9.56-23.72-9.56h-.44z" />
      </svg>

      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarAccents[t.accent]} flex items-center justify-center text-white font-display text-sm font-bold shadow-soft ring-2 ring-white`}
        >
          {t.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight truncate">
            {t.name}
          </p>
          <p className="text-[11px] text-ink/50 font-mono mt-0.5 truncate">
            {t.city} · {t.sessionsCompleted} sessions
          </p>
        </div>
        <GoogleRating count={t.rating} />
      </div>

      <div className="mb-4">
        <span
          className={`inline-flex items-center text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${chipAccents[t.accent]}`}
        >
          {t.concern}
        </span>
      </div>

      <blockquote className="text-sm leading-relaxed text-ink/75">
        <span className="text-[0] select-none">"</span>
        {t.quote}
        <span className="text-[0] select-none">"</span>
      </blockquote>
    </div>
  );
}

export default function Testimonials() {
  const looped = [...testimonials, ...testimonials];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sage-light/30 via-paper to-amber-light/20" />
      <div
        className="absolute inset-0 -z-10 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 20%, rgba(74,99,85,0.10) 0, transparent 45%), radial-gradient(circle at 88% 80%, rgba(184,128,74,0.10) 0, transparent 45%)",
        }}
      />

      <div className="py-16 md:py-24">
        <RevealSection className="text-center max-w-2xl mx-auto mb-14 px-6">
          <p className="font-mono text-xs tracking-widest text-sage uppercase mb-3">
            From people who started exactly where you are
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-4 leading-tight">
            Stories from sessions that helped.
          </h2>
          <p className="text-ink/70 text-base leading-relaxed">
            Real clients sharing, in their own words, how Whybeigh made a
            difference in a week that felt impossible to get through.
          </p>
        </RevealSection>

        {/* Horizontal auto-scrolling marquee of review cards */}
        <div className="relative w-full overflow-hidden group">
          {/* Soft left/right fade gradients so cards don't look cut off */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-24 z-10 bg-gradient-to-r from-paper via-paper/90 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-24 z-10 bg-gradient-to-l from-paper via-paper/90 to-transparent" />

          <div
            className="flex w-max animate-marquee hover:[animation-play-state:paused] gap-5 px-6"
            style={{ animationDuration: "48s" }}
          >
            {looped.map((t, i) => (
              <ReviewCard key={`${t.id}-${i}`} t={t} />
            ))}
          </div>
        </div>

        <RevealSection className="mt-14 text-center px-6">
          <p className="text-xs text-ink/40 font-mono uppercase tracking-widest mb-2">
            Aggregated experience
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-2xl bg-white/60 border border-sage/10 px-6 md:px-10 py-5 shadow-soft">
            <div className="text-left">
              <p className="font-display text-2xl md:text-3xl font-bold text-sage-dark">
                4.8
                <span className="align-top text-sm text-amber ml-1">★</span>
              </p>
              <p className="text-[11px] text-ink/50 mt-0.5">
                Avg. rating · 1,240+ reviews
              </p>
            </div>
            <div className="hidden md:block w-px h-10 bg-sage/15" />
            <div className="text-left">
              <p className="font-display text-2xl md:text-3xl font-bold text-ink">
                94<span className="text-sage text-xl">%</span>
              </p>
              <p className="text-[11px] text-ink/50 mt-0.5">
                Book a follow-up session
              </p>
            </div>
            <div className="hidden md:block w-px h-10 bg-sage/15" />
            <div className="text-left">
              <p className="font-display text-2xl md:text-3xl font-bold text-ink">
                15k<span className="text-sage text-xl">+</span>
              </p>
              <p className="text-[11px] text-ink/50 mt-0.5">
                Sessions completed
              </p>
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
