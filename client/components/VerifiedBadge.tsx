"use client";

import { useState } from "react";

export type VerifiedBadgeType =
  | "background"
  | "degree"
  | "sessions"
  | "languages"
  | "identity"
  | "license";

const meta: Record<
  VerifiedBadgeType,
  { label: string; tooltip: string; accent: string }
> = {
  background: {
    label: "Background checked",
    tooltip:
      "Counsellor identity & professional references have been manually verified by our team.",
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  degree: {
    label: "Degree verified",
    tooltip:
      "Postgraduate qualification in psychology / counselling has been reviewed and confirmed.",
    accent: "text-sky-700 bg-sky-50 border-sky-200",
  },
  sessions: {
    label: "1000+ sessions",
    tooltip:
      "Has completed 1,000+ paid sessions on Whybeigh with a positive outcome rate.",
    accent: "text-amber-700 bg-amber-50 border-amber-200",
  },
  languages: {
    label: "Languages verified",
    tooltip:
      "Language proficiency has been confirmed via test call with our operations team.",
    accent: "text-violet-700 bg-violet-50 border-violet-200",
  },
  identity: {
    label: "Identity verified",
    tooltip:
      "Government-issued ID has been cross-checked against profile information.",
    accent: "text-sage-dark bg-sage-light border-sage/30",
  },
  license: {
    label: "RCI Licensed",
    tooltip:
      "Registered with the Rehabilitation Council of India (RCI) — license number on file.",
    accent: "text-rose-700 bg-rose-50 border-rose-200",
  },
};

const icons: Record<VerifiedBadgeType, React.ReactNode> = {
  background: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  degree: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
    </svg>
  ),
  sessions: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  languages: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
    </svg>
  ),
  identity: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5l-3 5.25L15 15M16.5 7.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM4.5 20.25a7.5 7.5 0 0115 0" />
    </svg>
  ),
  license: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
};

type Props = {
  type: VerifiedBadgeType;
  size?: "sm" | "md";
  showLabel?: boolean;
};

export default function VerifiedBadge({
  type,
  size = "sm",
  showLabel = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const m = meta[type];
  const Icon = icons[type];

  const chipSize =
    size === "md"
      ? "px-3 py-1.5 text-[11px] gap-1.5"
      : "px-2.5 py-1 text-[10px] gap-1";

  return (
    <div className="relative inline-flex">
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        className={`inline-flex items-center border rounded-full font-medium transition-colors cursor-help select-none ${chipSize} ${m.accent}`}
      >
        <span className="shrink-0">{Icon}</span>
        {showLabel && <span className="whitespace-nowrap">{m.label}</span>}
      </span>

      <div
        role="tooltip"
        className={`absolute left-1/2 -translate-x-1/2 bottom-full z-50 mb-2 w-60 pointer-events-none transition-all duration-150 ${
          open
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 invisible"
        }`}
      >
        <div className="bg-ink text-white/90 text-[11px] leading-relaxed rounded-xl px-3 py-2.5 shadow-soft-lg border border-white/5">
          <strong className="block mb-0.5 text-white">{m.label}</strong>
          {m.tooltip}
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-px block w-2.5 h-2.5 rotate-45 bg-ink border-r border-b border-white/5" />
      </div>
    </div>
  );
}
