"use client";

const items = [
  {
    label: "Verified professionals",
    sub: "Screened & verified",
    icon: (
      <svg className="w-4 h-4 text-sage-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    label: "Private & secure",
    sub: "Always protected",
    icon: (
      <svg className="w-4 h-4 text-sage-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    label: "Transparent pricing",
    sub: "No hidden charges",
    icon: (
      <svg className="w-4 h-4 text-sage-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Flexible scheduling",
    sub: "Book any time",
    icon: (
      <svg className="w-4 h-4 text-sage-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
      </svg>
    ),
  },
];

function TrustItem({ label, sub, icon }: (typeof items)[0]) {
  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 px-6">
      <div className="w-7 h-7 rounded-full bg-sage-light flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-ink whitespace-nowrap">{label}</span>
        <span className="text-ink/30 text-xs">·</span>
        <span className="text-xs text-ink/45 whitespace-nowrap">{sub}</span>
      </div>
    </div>
  );
}

function Separator() {
  return (
    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-sage/25 mx-2 self-center" />
  );
}

export default function TrustBarMarquee() {
  // Duplicate items for seamless loop
  const repeated = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden relative">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white/80 to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none" />

      <div
        className="animate-marquee"
        style={{ width: "max-content" }}
      >
        {repeated.map((item, i) => (
          <span key={i} className="inline-flex items-center">
            <TrustItem {...item} />
            <Separator />
          </span>
        ))}
      </div>
    </div>
  );
}
