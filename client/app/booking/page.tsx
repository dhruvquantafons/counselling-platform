const groups = [
  { label: "Morning", slots: ["9:00 AM", "10:00 AM", "11:30 AM"] },
  { label: "Afternoon", slots: ["2:00 PM", "3:30 PM"] },
  { label: "Evening", slots: ["5:00 PM", "6:00 PM", "7:30 PM"] },
];

export default function SlotPicker() {
  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <header className="mb-10 text-center">
        <p className="font-mono text-xs text-sage-dark uppercase mb-2">Step 3 of 4</p>
        <h1 className="font-display text-3xl mb-2">Take your time.</h1>
        <p className="text-sm text-ink/60">Choose an hour that works for you — shown in your local timezone (IST).</p>
      </header>

      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-xs font-mono text-ink/40 uppercase mb-3">{g.label}</p>
            <div className="flex flex-wrap gap-2.5">
              {g.slots.map((s) => (
                <button
                  key={s}
                  className="font-mono text-sm border border-sage/25 bg-white rounded-full px-5 py-3 hover:bg-sage-light hover:border-sage/50 hover:scale-[1.02] transition-all duration-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink/40 text-center mt-10">This hour will be held for 10 minutes while you confirm.</p>
    </main>
  );
}