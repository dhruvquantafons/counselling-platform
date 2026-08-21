async function getCounsellor(id: string) {
  const res = await fetch(`http://localhost:4000/api/counsellors/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function CounsellorProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const counsellor = await getCounsellor(id);
  
  if (!counsellor) {
    return <main className="max-w-3xl mx-auto px-6 py-16"><p>Counsellor not found.</p></main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center font-display text-2xl text-sage-dark mb-6">
        {counsellor.name.split(" ").filter((w: string) => w[0] === w[0].toUpperCase() && w !== "Dr.").map((w: string) => w[0]).slice(0, 2).join("")}
      </div>
      <h1 className="font-display text-3xl mb-2">{counsellor.name}</h1>
      <p className="text-ink/60 mb-6">{counsellor.specialisation} · {counsellor.languages.join(", ")}</p>
      <p className="text-ink/80 mb-8">{counsellor.bio}</p>
      <div className="flex items-center justify-between border-t border-sage/15 pt-6">
        <p className="font-mono text-xl text-sage-dark">₹{counsellor.fee}</p>
        <a href="/checkout" className="bg-sage text-white px-6 py-2 rounded-full text-sm">Book a Session</a>
      </div>
    </main>
  );
}