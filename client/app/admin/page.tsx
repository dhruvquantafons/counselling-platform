const stats = [
  { label: "Bookings today", value: "12" },
  { label: "Revenue (MTD)", value: "₹84,200" },
  { label: "No-shows", value: "1" },
  { label: "Active counsellors", value: "4" },
];

export default function Admin() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">Admin</h1>
        <nav className="flex gap-6 text-sm font-mono text-ink/60">
          <a href="#" className="text-sage-dark">Overview</a>
          <a href="#">Counsellors</a>
          <a href="#">Bookings</a>
          <a href="#">Payments</a>
        </nav>
      </div>

      <div className="flex items-center divide-x divide-sage/20 border-y border-sage/15 py-5 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="flex-1 px-6 first:pl-0">
            <p className="text-xs text-ink/50 mb-1">{s.label}</p>
            <p className="font-display text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs font-mono text-ink/40 uppercase mb-3">Recent bookings</p>
      <div className="space-y-2">
        {[
          { n: "Dr. Anjali Mehta", t: "Today, 4:00 PM" },
          { n: "Rohan Sharma", t: "Tomorrow, 10:00 AM" },
          { n: "Dr. Priya Nair", t: "Today, 6:00 PM" },
        ].map((b) => (
          <div key={b.n} className="flex items-center justify-between bg-white rounded-xl border border-sage/15 px-5 py-3.5 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
              <span>{b.n}</span>
              <span className="font-mono text-ink/40 text-xs">{b.t}</span>
            </div>
            <span className="font-mono text-ink/50 text-xs">Confirmed</span>
          </div>
        ))}
      </div>
    </main>
  );
}