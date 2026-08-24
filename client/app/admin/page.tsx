const stats = [
  {
    label: "Bookings today",
    value: "12",
    change: "+3 from yesterday",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    label: "Revenue (MTD)",
    value: "₹84,200",
    change: "+12% vs last month",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    label: "No-shows",
    value: "1",
    change: "0.8% rate",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  {
    label: "Active counsellors",
    value: "4",
    change: "All approved",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];

const recentBookings = [
  {
    name: "Dr. Anjali Mehta",
    client: "Rahul Verma",
    time: "Today, 4:00 PM",
    status: "Confirmed",
    fee: "₹1,500",
  },
  {
    name: "Rohan Sharma",
    client: "Priya Singh",
    time: "Tomorrow, 10:00 AM",
    status: "Pending",
    fee: "₹1,200",
  },
  {
    name: "Dr. Priya Nair",
    client: "Amit Kumar",
    time: "Today, 6:00 PM",
    status: "Confirmed",
    fee: "₹2,000",
  },
  {
    name: "Dr. Anjali Mehta",
    client: "Sneha Patel",
    time: "Tomorrow, 2:00 PM",
    status: "Confirmed",
    fee: "₹1,500",
  },
];

export default function Admin() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-ink">Admin</h1>
          <p className="text-sm text-ink/50 mt-1">
            Welcome back. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-mono text-ink/60">
          <a href="#" className="text-sage-dark font-medium border-b-2 border-sage pb-1">
            Overview
          </a>
          <a
            href="#"
            className="hover:text-ink transition-colors pb-1"
          >
            Counsellors
          </a>
          <a
            href="#"
            className="hover:text-ink transition-colors pb-1"
          >
            Bookings
          </a>
          <a
            href="#"
            className="hover:text-ink transition-colors pb-1"
          >
            Payments
          </a>
        </nav>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`card-hover bg-white rounded-2xl border border-sage/10 p-5 shadow-soft animate-fade-in-up stagger-${i + 1}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-ink/50">{s.label}</p>
              <div className="w-8 h-8 rounded-lg bg-sage-light flex items-center justify-center text-sage-dark">
                {s.icon}
              </div>
            </div>
            <p className="font-display text-2xl text-ink mb-1">{s.value}</p>
            <p className="text-xs text-ink/40">{s.change}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-sage/10 overflow-hidden shadow-soft">
        <div className="px-6 py-5 border-b border-sage/10 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-ink/40 uppercase tracking-wide mb-0.5">
              Recent bookings
            </p>
            <p className="text-sm text-ink/60">
              Latest session bookings across all counsellors
            </p>
          </div>
          <a
            href="#"
            className="text-xs font-medium text-sage-dark hover:text-sage transition-colors"
          >
            View all →
          </a>
        </div>

        <div className="divide-y divide-sage/10">
          {recentBookings.map((b) => (
            <div
              key={b.name + b.time}
              className="flex items-center justify-between px-6 py-4 hover:bg-sage-light/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center font-display text-sm text-sage-dark shrink-0 ring-1 ring-sage/10">
                  {b.name
                    .split(" ")
                    .filter((w: string) => w[0] === w[0].toUpperCase() && w !== "Dr.")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{b.name}</p>
                  <p className="text-xs text-ink/50">
                    {b.client} · {b.time}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-1 ${
                    b.status === "Confirmed"
                      ? "bg-sage-light text-sage-dark"
                      : "bg-amber-light text-amber"
                  }`}
                >
                  {b.status}
                </span>
                <p className="font-mono text-sm text-ink/60">{b.fee}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
