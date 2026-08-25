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

export default async function Directory() {
  const counsellors = await getCounsellors();

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <header className="mb-12 max-w-2xl animate-fade-in-up">
        <p className="font-mono text-xs tracking-wide text-sage uppercase mb-3">
          Find support
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight mb-4 text-ink">
          A quiet place to talk to someone who understands.
        </h1>
        <p className="text-ink/60 text-lg">
          Browse counsellors by specialisation, language, and fee. Every profile
          shows their next open hour.
        </p>
      </header>

      <div className="grid md:grid-cols-[240px_1fr] gap-10">
        <aside className="hidden md:block sticky top-24 self-start">
          <div className="bg-white rounded-2xl border border-sage/10 p-6 shadow-soft">
            <p className="text-xs font-mono text-ink/40 uppercase tracking-wide mb-4">
              Specialisation
            </p>
            <div className="space-y-2.5 text-sm text-ink/70">
              {["Anxiety & stress", "Relationships", "Depression & mood", "Career & life"].map(
                (s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      className="accent-sage w-4 h-4 rounded border-sage/30"
                      disabled
                    />
                    <span className="group-hover:text-ink transition-colors">
                      {s}
                    </span>
                  </label>
                )
              )}
            </div>
            <p className="text-xs text-ink/30 mt-4 italic">
              Filtering coming next sprint
            </p>
          </div>
        </aside>

        <div>
          <p className="text-xs font-mono text-ink/40 uppercase tracking-wide mb-4">
            {counsellors.length} counsellors available
          </p>
          <div className="space-y-3">
            {counsellors.map((c: Counsellor, i: number) => (
              <Link
                key={c.id}
                href={`/directory/${c.id}`}
                className={`card-hover group flex items-center gap-5 bg-white rounded-2xl border border-sage/10 p-5 shadow-soft animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center font-display text-xl text-sage-dark shrink-0 ring-2 ring-sage/10 group-hover:ring-sage/25 transition-all">
                  {c.name
                    .split(" ")
                    .filter((w: string) => w[0] === w[0].toUpperCase() && w !== "Dr.")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg text-ink group-hover:text-sage-dark transition-colors">
                    {c.name}
                  </h2>
                  <p className="text-sm text-ink/60 mt-0.5">
                    {c.specialisation} · {c.languages.join(", ")}
                  </p>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <p className="font-mono text-lg text-sage-dark">₹{c.fee}</p>
                  <span className="text-xs text-amber font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View profile →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
