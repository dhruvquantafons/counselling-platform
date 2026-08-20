const counsellors = [
  { name: "Dr. Anjali Mehta", spec: "Anxiety & Stress Management", langs: "English, Hindi", fee: 1200, next: "Today, 4:00 PM" },
  { name: "Rohan Sharma", spec: "Relationship Counselling", langs: "English, Hindi, Gujarati", fee: 1500, next: "Tomorrow, 10:00 AM" },
  { name: "Dr. Priya Nair", spec: "Depression & Mood Disorders", langs: "English, Malayalam", fee: 1800, next: "Today, 6:00 PM" },
  { name: "Karan Verma", spec: "Career & Life Coaching", langs: "English, Hindi", fee: 1000, next: "Tomorrow, 2:00 PM" },
];

export default function Directory() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <header className="mb-12 max-w-xl">
        <p className="font-mono text-xs tracking-wide text-sage uppercase mb-3">Find support</p>
        <h1 className="font-display text-4xl leading-tight mb-4">A quiet place to talk to someone who understands.</h1>
        <p className="text-ink/70">Browse counsellors by specialisation, language, and fee. Every profile shows their next open hour.</p>
      </header>

      <div className="grid grid-cols-[200px_1fr] gap-10">
        <aside className="sticky top-16 self-start space-y-6">
          <div>
            <p className="text-xs font-mono text-ink/40 uppercase mb-2">Specialisation</p>
            <div className="space-y-1.5 text-sm text-ink/70">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" /> Anxiety & stress</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" /> Relationships</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" /> Depression & mood</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" /> Career & life</label>
            </div>
          </div>
          <div>
            <p className="text-xs font-mono text-ink/40 uppercase mb-2">Language</p>
            <div className="space-y-1.5 text-sm text-ink/70">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" /> English</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" /> Hindi</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" /> Gujarati</label>
            </div>
          </div>
          <div>
            <p className="text-xs font-mono text-ink/40 uppercase mb-2">Fee range</p>
            <input type="range" min="500" max="2000" className="w-full accent-sage" />
          </div>
        </aside>

        <div className="divide-y divide-sage/15">
          {counsellors.map((c) => (
            <a key={c.name} href="/checkout" className="group flex items-center justify-between gap-6 py-6 hover:bg-sage-light/40 -mx-4 px-4 rounded-xl transition-colors">
              <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center font-display text-lg text-sage-dark shrink-0">
                {c.name.split(" ").filter(w => w[0] === w[0].toUpperCase() && w !== "Dr.").map(w => w[0]).slice(0,2).join("")}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl">{c.name}</h2>
                <p className="text-sm text-ink/60">{c.spec} · {c.langs}</p>
                <div className="flex items-center gap-2 text-xs mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
                  <span className="font-mono text-sage-dark">Next available · {c.next}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-mono text-lg text-sage-dark">₹{c.fee}</p>
                <span className="text-xs text-amber opacity-0 group-hover:opacity-100 transition-opacity">Book session &rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}