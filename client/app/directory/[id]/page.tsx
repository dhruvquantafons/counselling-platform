import Link from "next/link";

async function getCounsellor(id: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const res = await fetch(`${apiBase}/api/counsellors/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

type Counsellor = {
  id: string;
  name: string;
  specialisation: string;
  languages: string[];
  fee: number;
  bio: string;
};

export default async function CounsellorProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const counsellor = (await getCounsellor(id)) as Counsellor | null;

  if (!counsellor) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-sage/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          </div>
          <p className="text-ink/50 mb-4">Counsellor not found.</p>
          <Link
            href="/directory"
            className="text-sm text-sage-dark hover:text-sage transition-colors"
          >
            ← Back to directory
          </Link>
        </div>
      </main>
    );
  }

  const initials = counsellor.name
    .split(" ")
    .filter((w: string) => w[0] === w[0].toUpperCase() && w !== "Dr.")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("");

  const features = [
    {
      label: "Session length",
      value: "50 minutes",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Format",
      value: "Private video session",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      label: "Confidentiality",
      value: "End-to-end encrypted",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      label: "Cancellation",
      value: "Free up to 24 hours before",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">
      <Link
        href="/directory"
        className="inline-flex items-center text-sm text-ink/50 hover:text-ink transition-colors mb-8"
      >
        <svg className="mr-1.5 w-4 h-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        Back to directory
      </Link>

      <div className="grid md:grid-cols-[1fr_300px] gap-12">
        <div>
          <div className="flex items-center gap-5 mb-8">
            <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center font-display text-2xl text-sage-dark ring-3 ring-sage/15">
              {initials}
            </div>
            <div>
              <h1 className="font-display text-3xl text-ink">{counsellor.name}</h1>
              <p className="text-ink/60 mt-1">
                {counsellor.specialisation} · {counsellor.languages.join(", ")}
              </p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="font-display text-xl text-ink mb-3">About</h2>
            <p className="text-ink/70 leading-relaxed whitespace-pre-line">
              {counsellor.bio}
            </p>
          </div>

          <div className="pt-8 border-t border-sage/15">
            <h2 className="font-display text-xl text-ink mb-5">
              What to expect
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.label} className="card-hover bg-white rounded-xl border border-sage/10 p-5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-sage-light flex items-center justify-center text-sage-dark shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-mono text-xs text-ink/40 uppercase tracking-wide mb-1">
                      {f.label}
                    </p>
                    <p className="text-sm text-ink/80">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="md:sticky md:top-24 h-fit">
          <div className="bg-white rounded-2xl border border-sage/15 p-6 shadow-soft-md">
            <p className="font-mono text-xs text-ink/40 uppercase tracking-wide mb-1">
              Session fee
            </p>
            <p className="font-display text-3xl text-sage-dark mb-6">
              ₹{counsellor.fee}
            </p>

            <Link
              href={`/checkout?counsellorId=${counsellor.id}`}
              className="block w-full bg-sage text-white text-center py-3.5 rounded-full font-medium hover:bg-sage-dark transition-colors text-sm mb-3 active:scale-[0.97]"
            >
              Book a session
            </Link>
            <p className="text-xs text-ink/40 text-center">
              No payment until you confirm
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
