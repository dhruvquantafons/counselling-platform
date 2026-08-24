const groups = [
  {
    label: "Morning",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
    slots: ["9:00 AM", "10:00 AM", "11:30 AM"],
  },
  {
    label: "Afternoon",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    slots: ["2:00 PM", "3:30 PM"],
  },
  {
    label: "Evening",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
    slots: ["5:00 PM", "6:00 PM", "7:30 PM"],
  },
];

export default function SlotPicker() {
  return (
    <main className="max-w-lg mx-auto px-6 py-16 animate-fade-in">
      <header className="mb-10 text-center">
        <p className="font-mono text-xs text-sage-dark uppercase tracking-wide mb-2">
          Step 3 of 4
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-3 text-ink">
          Take your time.
        </h1>
        <p className="text-sm text-ink/60 max-w-sm mx-auto">
          Choose an hour that works for you — shown in your local timezone (IST).
          This slot will be held for 10 minutes while you confirm.
        </p>
      </header>

      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sage-dark">{g.icon}</span>
              <p className="text-xs font-mono text-ink/40 uppercase tracking-wide">
                {g.label}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {g.slots.map((s) => (
                <button
                  key={s}
                  className="font-mono text-sm border border-sage/20 bg-white text-ink rounded-full px-5 py-3 hover:bg-sage hover:text-white hover:border-sage hover:shadow-soft active:scale-[0.97] transition-all duration-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-center gap-3">
        <a
          href="/checkout?counsellorId=1"
          className="text-sm text-ink/50 hover:text-ink transition-colors"
        >
          ← Back to details
        </a>
        <span className="text-ink/20">|</span>
        <span className="text-xs text-ink/30">Select a slot to continue</span>
      </div>
    </main>
  );
}
