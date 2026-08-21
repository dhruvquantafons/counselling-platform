async function getCounsellors() {
  const res = await fetch('http://localhost:4000/api/counsellors', { cache: 'no-store' });
  return res.json();
}

export default async function Directory() {
  const counsellors = await getCounsellors();

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
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" disabled /> Anxiety & stress</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" disabled /> Relationships</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" disabled /> Depression & mood</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-sage" disabled /> Career & life</label>
            </div>
            <p className="text-xs text-ink/30 mt-2 italic">Filtering coming next sprint</p>
          </div>
        </aside>

        <div className="divide-y divide-sage/15">
          {counsellors.map((c: any) => (
            <a
              key={c.id}
              href={`/directory/${c.id}`}
              className="group flex items-center justify-between gap-6 py-6 hover:bg-sage-light/40 -mx-4 px-4 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center font-display text-lg text-sage-dark shrink-0">
                {c.name.split(" ").filter((w: string) => w[0] === w[0].toUpperCase() && w !== "Dr.").map((w: string) => w[0]).slice(0, 2).join("")}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl">{c.name}</h2>
                <p className="text-sm text-ink/60">{c.specialisation} · {c.languages.join(", ")}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-mono text-lg text-sage-dark">₹{c.fee}</p>
                <span className="text-xs text-amber opacity-0 group-hover:opacity-100 transition-opacity">View profile &rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}