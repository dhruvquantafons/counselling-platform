"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin-dev-secret";

function adminHeaders() {
  return { "x-admin-secret": ADMIN_SECRET, "Content-Type": "application/json" };
}

type SummaryData = {
  totalBookings: number;
  confirmed: number;
  cancellations: number;
  completed: number;
  noShows: number;
  revenue: number;
  from: string | null;
  to: string | null;
};

type RecentBooking = {
  id: string;
  visitorName: string;
  startTime: string;
  status: string;
  counsellor: { name: string };
  payment: { amount: number; status: string } | null;
};

type CounsellorApproval = {
  id: string;
  name: string;
  email: string;
  status: string;
};

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseDateOr(s: string | null | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

export default function AdminPage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [prevSummary, setPrevSummary] = useState<SummaryData | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [pendingApprovals, setPendingApprovals] = useState<CounsellorApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 5;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setBookingsPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchSummary = useCallback(async (f: string, t: string) => {
    const res = await fetch(`${API_BASE}/api/admin/reports/summary?from=${f}&to=${t}`, { headers: adminHeaders() });
    if (!res.ok) throw new Error("Failed to load summary");
    return (await res.json()) as SummaryData;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fromD = parseDateOr(from, new Date(Date.now() - 30 * 24 * 3600 * 1000));
      const toD = parseDateOr(to, new Date());
      const spanMs = Math.max(1, toD.getTime() - fromD.getTime());
      const prevTo = new Date(fromD.getTime() - 1);
      const prevFrom = new Date(fromD.getTime() - spanMs);
      const prevFromStr = prevFrom.toISOString().slice(0, 10);
      const prevToStr = prevTo.toISOString().slice(0, 10);

      const bookParams = new URLSearchParams({ page: String(bookingsPage), pageSize: String(pageSize) });
      if (debouncedSearch) {
        bookParams.set("search", debouncedSearch);
      }
      const [cur, bookRes, appRes] = await Promise.all([
        fetchSummary(from, to),
        fetch(`${API_BASE}/api/admin/bookings?${bookParams.toString()}`, { headers: adminHeaders() }),
        fetch(`${API_BASE}/api/admin/counsellors?status=PENDING&pageSize=50`, { headers: adminHeaders() }).catch(() => null),
      ]);

      setSummary(cur);

      try {
        const prev = await fetchSummary(prevFromStr, prevToStr);
        setPrevSummary(prev);
      } catch {
        setPrevSummary(null);
      }

      if (bookRes.ok) {
        const data = await bookRes.json();
        setRecentBookings(Array.isArray(data?.bookings) ? data.bookings : []);
        setBookingsTotal(typeof data?.total === "number" ? data.total : 0);
      } else {
        setRecentBookings([]);
        setBookingsTotal(0);
      }
      if (appRes && appRes.ok) {
        const data = await appRes.json();
        setPendingApprovals(Array.isArray(data) ? data : (data?.counsellors || []));
      } else {
        setPendingApprovals([]);
      }
    } catch (e: any) {
      setError(e.message || "Could not load dashboard data");
      setRecentBookings([]);
      setBookingsTotal(0);
      setPendingApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, fetchSummary, bookingsPage, pageSize, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function exportCsv() {
    if (!summary) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Bookings", String(summary.totalBookings)],
      ["Confirmed", String(summary.confirmed)],
      ["Cancellations", String(summary.cancellations)],
      ["Completed", String(summary.completed)],
      ["Revenue (₹)", String(summary.revenue)],
      ["Period From", from],
      ["Period To", to],
    ];
    downloadCsv(rows, `admin-report-${from}-to-${to}.csv`);
  }

  const navLinks = [
    { href: "/admin", label: "Overview", active: true },
    { href: "/admin/counsellors", label: "Counsellors" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/content", label: "Content" },
    { href: "/admin/counsellor-applications", label: "Applications" },
    { href: "/admin/audit", label: "Audit Log" },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      CONFIRMED: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
      CANCELLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
      COMPLETED: "bg-amber-50 text-amber ring-1 ring-amber/20",
      PENDING: "bg-amber-50 text-amber ring-1 ring-amber/20",
    };
    const cls = map[s] || "bg-ink/5 text-ink/60 ring-1 ring-ink/5";
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          s === "CONFIRMED" ? "bg-sage" :
          s === "CANCELLED" ? "bg-rose-500" :
          s === "COMPLETED" ? "bg-amber" :
          s === "PENDING" ? "bg-amber" : "bg-ink/30"
        }`} />
        {s.charAt(0) + s.slice(1).toLowerCase()}
      </span>
    );
  };

  const pctChange = (cur: number, prev: number | null | undefined): { v: number; up: boolean; label: string } | null => {
    if (prev == null || isNaN(prev)) return null;
    if (prev === 0 && cur === 0) return { v: 0, up: true, label: "0%" };
    if (prev === 0) return { v: cur > 0 ? 100 : 0, up: cur > 0, label: cur > 0 ? "New" : "0%" };
    const delta = ((cur - prev) / prev) * 100;
    return {
      v: Math.abs(delta),
      up: delta >= 0,
      label: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`,
    };
  };

  const trendChip = (change: { v: number; up: boolean; label: string } | null, goodWhenUp: boolean) => {
    if (!change) return <span className="text-[11px] text-ink/30">No comparison</span>;
    const isGood = change.up === goodWhenUp;
    const cls = isGood
      ? "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/60"
      : "text-rose-700 bg-rose-50 ring-1 ring-rose-200/60";
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${cls}`}>
        {change.label}
      </span>
    );
  };

  const cardAccent = (variant: "bookings" | "revenue" | "cancellations", val?: number) => {
    switch (variant) {
      case "revenue":
        return {
          ring: "ring-1 ring-sage/20",
          iconBg: "bg-gradient-to-br from-sage to-sage-dark text-white shadow-soft",
          accentBar: "bg-gradient-to-r from-sage to-sage-dark",
        };
      case "cancellations": {
        const rate = summary?.totalBookings ? (val ?? 0) / summary.totalBookings : 0;
        const isHigh = rate > 0.2;
        return {
          ring: isHigh ? "ring-1 ring-rose-300/70" : "ring-1 ring-amber/20",
          iconBg: isHigh
            ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-soft"
            : "bg-gradient-to-br from-amber to-amber-600 text-white shadow-soft",
          accentBar: isHigh
            ? "bg-gradient-to-r from-rose-500 to-rose-700"
            : "bg-gradient-to-r from-amber to-amber-600",
        };
      }
      case "bookings":
      default:
        return {
          ring: "ring-1 ring-sky-200/80",
          iconBg: "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-soft",
          accentBar: "bg-gradient-to-r from-sky-500 to-indigo-600",
        };
    }
  };

  const pendingCount = pendingApprovals.length;
  const totalBookingsPages = Math.max(1, Math.ceil(bookingsTotal / pageSize));

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Platform Admin</p>
          <h1 className="font-display text-2xl text-ink">Overview</h1>
        </div>
        <nav className="flex flex-wrap gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                l.active
                  ? "bg-sage text-white shadow-soft"
                  : "text-ink/75 hover:text-ink hover:bg-sage-light/60 bg-sage-light/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-5 mb-6 flex flex-col sm:flex-wrap sm:flex-row items-stretch sm:items-center gap-4">
        <p className="text-xs font-mono text-ink/50 uppercase tracking-wide shrink-0">Period</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-1 sm:flex-none min-w-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full sm:w-auto border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
            />
            <span className="hidden sm:inline text-ink/30 text-sm self-center">→</span>
            <span className="sm:hidden text-ink/30 text-sm self-center">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full sm:w-auto border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
            />
          </div>
        </div>
        <button
          onClick={fetchData}
          className="bg-sage text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-sage-dark transition-colors w-full sm:w-auto"
        >
          Apply
        </button>
        <button
          onClick={exportCsv}
          disabled={!summary}
          className="flex items-center justify-center gap-1.5 border border-sage/20 text-ink/70 px-4 py-2 rounded-xl text-xs font-medium hover:bg-sage-light/40 transition-colors disabled:opacity-40 w-full sm:w-auto sm:ml-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200/60 rounded-xl px-4 py-3 text-sm text-rose-700 mb-6">{error}</div>
      )}

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          (() => {
            const variant: "bookings" = "bookings";
            const val = summary?.totalBookings ?? 0;
            const prev = prevSummary?.totalBookings;
            const accent = cardAccent(variant, val);
            return {
              variant,
              label: "Total Bookings",
              value: loading ? "—" : String(val),
              sub: `${summary?.confirmed ?? 0} confirmed · ${summary?.completed ?? 0} completed`,
              accent,
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              trend: trendChip(pctChange(val, prev), true),
            };
          })(),
          (() => {
            const variant: "revenue" = "revenue";
            const val = summary?.revenue ?? 0;
            const prev = prevSummary?.revenue;
            const accent = cardAccent(variant, val);
            return {
              variant,
              label: "Revenue",
              value: loading ? "—" : `₹${val.toLocaleString("en-IN")}`,
              sub: `${summary?.completed ?? 0} paid sessions`,
              accent,
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m7.5-4C19.5 15.538 16.056 18 12 18S4.5 15.538 4.5 14 7.944 10 12 10s7.5 1.538 7.5 4zM4.5 14a7.5 7.5 0 0015 0M12 3v.01" />
                </svg>
              ),
              trend: trendChip(pctChange(val, prev), true),
            };
          })(),
          (() => {
            const variant: "cancellations" = "cancellations";
            const val = summary?.cancellations ?? 0;
            const prev = prevSummary?.cancellations;
            const rate = summary?.totalBookings ? Math.round((val / summary.totalBookings) * 100) : 0;
            const accent = cardAccent(variant, val);
            return {
              variant,
              label: "Cancellations",
              value: loading ? "—" : String(val),
              sub: `${rate}% of all bookings`,
              accent,
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l10.5 9M17.25 7.5L6.75 16.5M22 12a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
              ),
              trend: trendChip(pctChange(val, prev), false),
            };
          })(),
        ].map((s, i) => (
          <div
            key={s.label}
            className={`card-hover bg-white rounded-2xl border border-sage/10 ${s.accent.ring} p-5 shadow-soft animate-fade-in-up stagger-${i + 1} relative overflow-hidden`}
          >
            <div className={`absolute left-0 top-0 w-1 h-full ${s.accent.accentBar}`} />
            <div className="flex items-start justify-between mb-3 pl-1">
              <p className="text-xs font-mono uppercase tracking-wider text-ink/55">{s.label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.accent.iconBg}`}>
                {s.icon}
              </div>
            </div>
            <p className="font-display text-2xl text-ink mb-1 pl-1 tabular-nums tracking-tight">{s.value}</p>
            <div className="flex items-center justify-between pl-1">
              <p className="text-xs text-ink/45">{s.sub}</p>
              {s.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            href: "/admin/counsellors?status=PENDING",
            label: "Pending Approvals",
            desc: `${pendingCount > 0 ? `${pendingCount} application${pendingCount === 1 ? "" : "s"} need review` : "No applications pending"}`,
            badge: pendingCount,
            color: "bg-amber-50 text-amber ring-1 ring-amber/20",
            iconBg: "bg-gradient-to-br from-amber to-amber-600 text-white",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            href: "/admin/bookings",
            label: "Booking Register",
            desc: "Full register with filters + CSV export",
            color: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
            iconBg: "bg-gradient-to-br from-sage to-sage-dark text-white",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75zM12 11.25h.008v.008H12v-.008z" />
              </svg>
            ),
          },
          {
            href: "/admin/payments",
            label: "Payment Register",
            desc: "Reconcile & process refunds",
            color: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
            iconBg: "bg-gradient-to-br from-sky-500 to-indigo-600 text-white",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            ),
          },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="card-hover bg-white rounded-2xl border border-sage/10 p-5 shadow-soft hover:border-sage/30 hover:shadow-md transition-all group relative"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.iconBg} shadow-soft`}>
                {l.icon}
              </div>
              {l.badge != null && l.badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold tracking-wide shadow-md ring-2 ring-white">
                  {l.badge > 99 ? "99+" : l.badge}
                </span>
              )}
            </div>
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${l.color}`}>
              {l.label}
            </span>
            <p className="text-sm text-ink/65 group-hover:text-ink transition-colors leading-snug">{l.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-sage/10 overflow-hidden shadow-soft">
        <div className="px-5 py-4 border-b border-sage/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-ink/40 uppercase tracking-wide mb-0.5">Recent bookings</p>
            <p className="text-sm text-ink/60">Latest across all counsellors</p>
          </div>
          <div className="flex items-center gap-4 flex-1 max-w-md justify-end">
            <div className="relative w-full max-w-[240px] flex items-center">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-ink/40">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-20 py-1.5 border border-sage/20 rounded-xl text-xs text-ink bg-paper/30 placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:bg-white transition-all"
              />
              <button
                onClick={() => setDebouncedSearch(searchTerm)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-sage-light/40 transition-colors"
                title="Search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <Link href="/admin/bookings" className="text-xs font-medium text-sage-dark hover:text-sage transition-colors inline-flex items-center gap-1 shrink-0">
              View all
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[20%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-ink/40 bg-paper/40 border-b border-sage/10">
              <th className="px-3 py-3 font-semibold">Visitor</th>
              <th className="px-3 py-3 font-semibold truncate">Counsellor</th>
              <th className="px-3 py-3 font-semibold truncate">Date &amp; Time</th>
              <th className="px-3 py-3 font-semibold truncate">Status</th>
              <th className="px-3 py-3 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-3 py-3"><div className="h-3 bg-sage-light/40 rounded w-3/4" /></td>
                ))}
              </tr>
            ))}
            {!loading && recentBookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-sm text-ink/40">
                  {debouncedSearch ? "No bookings found matching your search." : "No bookings found yet."}
                </td>
              </tr>
            )}
            {!loading && recentBookings.map((b) => (
              <tr key={b.id} className="hover:bg-sage-light/20 transition-colors">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center font-display text-[11px] text-sage-dark shrink-0 ring-1 ring-sage/10">
                      {(b.visitorName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{b.visitorName || "—"}</p>
                      <p className="text-[10px] text-ink/40 font-mono truncate">ID: {(b.id || "").slice(0, 8)}…</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-ink/75 truncate">{b.counsellor?.name || "—"}</td>
                <td className="px-3 py-3 text-ink/70 whitespace-nowrap">
                  <span className="text-[11px]">{new Date(b.startTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                  <span className="text-ink/30 mx-0.5">·</span>
                  <span className="font-mono text-[10px]">
                    {new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                    b.status === "CONFIRMED" ? "bg-sage-50 text-sage-dark ring-1 ring-sage/20" :
                    b.status === "CANCELLED" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" :
                    b.status === "COMPLETED" ? "bg-amber-50 text-amber ring-1 ring-amber/20" :
                    b.status === "PENDING"   ? "bg-amber-50 text-amber ring-1 ring-amber/20" :
                                              "bg-ink/5 text-ink/60 ring-1 ring-ink/5"
                  }`}>
                    <span className={`w-1 h-1 rounded-full mr-1 ${
                      b.status === "CONFIRMED" ? "bg-sage" :
                      b.status === "CANCELLED" ? "bg-rose-500" :
                      b.status === "COMPLETED" ? "bg-amber" :
                      b.status === "PENDING"   ? "bg-amber" : "bg-ink/30"
                    }`} />
                    {(b.status || "—").charAt(0) + (b.status || "—").slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {b.payment ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                        ₹{Number(b.payment.amount).toLocaleString("en-IN")}
                      </span>
                      <span className={`text-[9px] font-mono uppercase tracking-wide ${
                        b.payment.status === "SUCCESS" ? "text-sage-dark" :
                        b.payment.status === "FAILED"  ? "text-rose-600" : "text-ink/40"
                      }`}>
                        {(b.payment.status || "").toLowerCase()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-ink/30 italic">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalBookingsPages > 1 && (
          <div className="px-5 py-4 border-t border-sage/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-ink/40">Showing {Math.min((bookingsPage - 1) * pageSize + 1, bookingsTotal)}–{Math.min(bookingsPage * pageSize, bookingsTotal)} of {bookingsTotal}</p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button onClick={() => setBookingsPage((p) => Math.max(1, p - 1))} disabled={bookingsPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30">← Prev</button>
              {Array.from({ length: totalBookingsPages }, (_, i) => i + 1).slice(
                Math.max(0, Math.min(bookingsPage - 3, totalBookingsPages - 5)),
                Math.max(0, Math.min(bookingsPage - 3, totalBookingsPages - 5)) + 5
              ).map((n) => (
                <button key={n} onClick={() => setBookingsPage(n)}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    bookingsPage === n
                      ? "bg-sage text-white border-sage shadow-soft"
                      : "text-ink/60 border-sage/20 hover:bg-sage-light/40"
                  }`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setBookingsPage((p) => Math.min(totalBookingsPages, p + 1))} disabled={bookingsPage === totalBookingsPages}
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
