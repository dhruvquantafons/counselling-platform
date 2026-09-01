"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin-dev-secret";
function adminHeaders() { return { "x-admin-secret": ADMIN_SECRET }; }

type Booking = {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  startTime: string;
  status: string;
  createdAt: string;
  counsellor: { id: string; name: string; email: string };
  payment: { id: string; amount: number; status: string; gatewayPaymentId: string | null; gatewayOrderId: string | null } | null;
};

type CounsellorOption = { id: string; name: string };

type AvailabilitySlot = {
  id: string;
  startTimeUtc: string;
  endTimeUtc: string;
  date: string;
  time: string;
  period: 'Morning' | 'Afternoon' | 'Evening';
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-dark ring-1 ring-amber/20",
  CONFIRMED: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
  CANCELLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  COMPLETED: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
};
const BOOKING_STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber",
  CONFIRMED: "bg-sage",
  CANCELLED: "bg-rose-500",
  COMPLETED: "bg-sky-500",
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  INITIATED: "bg-amber-50 text-amber-dark ring-1 ring-amber/20",
  SUCCESS: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
  FAILED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  REFUNDED: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
};
const PAYMENT_STATUS_DOT: Record<string, string> = {
  INITIATED: "bg-amber",
  SUCCESS: "bg-sage",
  FAILED: "bg-rose-500",
  REFUNDED: "bg-violet-500",
};

function capitalizeStatus(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/counsellors", label: "Counsellors" },
  { href: "/admin/bookings", label: "Bookings", active: true },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/counsellor-applications", label: "Applications" },
  { href: "/admin/audit", label: "Audit Log" },
];

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function AdminBookingsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [counsellors, setCounsellors] = useState<CounsellorOption[]>([]);
  const [counsellorId, setCounsellorId] = useState("");
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  // Slot editor state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editorTab, setEditorTab] = useState<'picker' | 'custom'>('picker');
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/counsellors?pageSize=1000`, { headers: adminHeaders() })
      .then((r) => r.json())
      .then((data) => setCounsellors((data.counsellors || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (counsellorId) params.set("counsellorId", counsellorId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      const res = await fetch(`${API_BASE}/api/admin/bookings?${params}`, { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();
      setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e: any) { setError(e.message); setBookings([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, counsellorId, dateFrom, dateTo, status, paymentStatus]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Slot editor helpers ────────────────────────────────────────────────
  function openEditor(b: Booking) {
    setEditingBooking(b);
    setEditorTab('picker');
    setSelectedSlotId(null);
    setSaveError(null);
    setSaveLoading(false);
    setAvailableSlots([]);
    // Initialise custom time fields to current booking time (IST offset for inputs)
    const st = new Date(b.startTime);
    const localIso = new Date(st.getTime() - st.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const et = new Date(st.getTime() + 50 * 60000);
    const localEndIso = new Date(et.getTime() - et.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCustomStart(localIso);
    setCustomEnd(localEndIso);
  }

  function closeEditor() {
    setEditingBooking(null);
    setAvailableSlots([]);
    setSelectedSlotId(null);
    setSaveError(null);
    setSaveLoading(false);
  }

  // Load available slots when editor opens
  useEffect(() => {
    const booking = editingBooking;
    if (!booking) return;
    const counsellorId = booking.counsellor.id;
    let cancelled = false;
    async function load() {
      setSlotsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/counsellors/${counsellorId}/availability?tz=Asia/Kolkata`);
        if (!res.ok) throw new Error('Failed to load available slots');
        const data: AvailabilitySlot[] = await res.json();
        if (!cancelled) setAvailableSlots(data);
      } catch (e: any) {
        if (!cancelled) setAvailableSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [editingBooking]);

  async function saveSlot() {
    if (!editingBooking) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const body: any = {};
      if (editorTab === 'picker') {
        if (!selectedSlotId) {
          setSaveError('Please select a slot from the list or switch to the Custom tab.');
          setSaveLoading(false);
          return;
        }
        body.newAvailabilityId = selectedSlotId;
      } else {
        if (!customStart) {
          setSaveError('Please set a start date & time.');
          setSaveLoading(false);
          return;
        }
        const start = new Date(customStart);
        if (isNaN(start.getTime())) {
          setSaveError('Invalid start date.');
          setSaveLoading(false);
          return;
        }
        body.customStartTime = start.toISOString();
        if (customEnd) {
          const end = new Date(customEnd);
          if (!isNaN(end.getTime())) body.customEndTime = end.toISOString();
        }
      }
      const res = await fetch(`${API_BASE}/api/admin/bookings/${editingBooking.id}/slot`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update slot');
      closeEditor();
      await fetchBookings();
    } catch (e: any) {
      setSaveError(e.message || 'Unknown error');
    } finally {
      setSaveLoading(false);
    }
  }

  function exportCsv() {
    const rows = [
      ["Booking ID", "Client", "Email", "Phone", "Counsellor", "Session Date", "Booking Status", "Payment Status", "Amount", "Gateway Payment ID"],
      ...bookings.map((b) => [
        b.id, b.visitorName, b.visitorEmail, b.visitorPhone,
        b.counsellor.name,
        new Date(b.startTime).toLocaleString("en-IN"),
        b.status,
        b.payment?.status ?? "—",
        b.payment ? `₹${Number(b.payment.amount)}` : "—",
        b.payment?.gatewayPaymentId ?? "—",
      ]),
    ];
    downloadCsv(rows, `bookings-export-${dateFrom}-to-${dateTo}.csv`);
  }

  const totalPages = Math.ceil(total / pageSize);

  const [copied, setCopied] = useState<string | null>(null);
  function doCopy(text: string, key: string) {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }

  function CopyChip({ value, label }: { value: string | null | undefined; label: string }) {
    if (!value) return <span className="text-xs text-ink/25 italic">—</span>;
    const key = label + value;
    const shown = value.length > 12 ? value.slice(0, 10) + "…" : value;
    const ok = copied === key;
    return (
      <button
        onClick={() => doCopy(value, key)}
        title={value}
        className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] ring-1 ring-sage/10 bg-paper hover:bg-white hover:ring-sage/30 transition-colors"
      >
        <span className="text-ink/40 group-hover:text-ink/65 transition-colors max-w-[160px] truncate" title={value}>{shown}</span>
        {ok ? (
          <svg className="w-2.5 h-2.5 text-sage-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5 text-ink/30 group-hover:text-ink/60 shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Platform Admin</p>
          <h1 className="font-display text-2xl text-ink">Booking Register</h1>
        </div>
        <nav className="flex flex-wrap gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${l.active ? "bg-sage text-white shadow-soft" : "text-ink/75 hover:text-ink hover:bg-sage-light/60 bg-sage-light/10"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-5 mb-6">
        <p className="text-xs font-mono text-ink/40 uppercase tracking-wide mb-4">Filters</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <select value={counsellorId} onChange={(e) => { setCounsellorId(e.target.value); setPage(1); }}
            className="border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20">
            <option value="">All Counsellors</option>
            {counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20">
            <option value="">All Statuses</option>
            {["PENDING","CONFIRMED","CANCELLED","COMPLETED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
            className="border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20">
            <option value="">All Payment Statuses</option>
            {["INITIATED","SUCCESS","FAILED","REFUNDED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={exportCsv} disabled={loading || bookings.length === 0}
            className="flex items-center gap-1.5 border border-sage/20 text-ink/70 px-4 py-2 rounded-xl text-xs font-medium hover:bg-sage-light/40 transition-colors disabled:opacity-40">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV ({total} rows)
          </button>
        </div>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200/60 rounded-xl px-4 py-3 text-sm text-rose-700 mb-6">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[15%]" />
            <col className="w-[6%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-sage/10 bg-paper/40">
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Book ID</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Client</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Counsellor</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Session</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Status</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Payment</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Gateway</th>
              <th className="text-right px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Amount</th>
              <th className="text-right px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-3 py-3"><div className="h-3 bg-sage-light/40 rounded w-3/4" /></td>
                ))}
              </tr>
            ))}
            {!loading && bookings.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-ink/40">No bookings match your filters.</td></tr>
            )}
            {!loading && bookings.map((b) => (
              <tr key={b.id} className="hover:bg-sage-light/20 transition-colors">
                <td className="px-3 py-3">
                  <CopyChip value={b.id} label={"bid" + b.id} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center font-display text-[11px] text-sage-dark shrink-0 ring-1 ring-sage/10">
                      {(b.visitorName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-ink text-xs truncate">{b.visitorName}</p>
                      <p className="text-[10px] text-ink/45 truncate">{b.visitorEmail}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink/75 text-xs truncate">{b.counsellor?.name || "—"}</td>
                <td className="px-3 py-3 text-ink/70 text-[11px] whitespace-nowrap">
                  {new Date(b.startTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  <span className="text-ink/30 mx-0.5">·</span>
                  <span className="font-mono text-[10px]">
                    {new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${BOOKING_STATUS_COLOR[b.status] ?? "bg-ink/5 text-ink/50 ring-1 ring-ink/10"}`}>
                    <span className={`w-1 h-1 rounded-full mr-1 ${BOOKING_STATUS_DOT[b.status] ?? "bg-ink/30"}`} />
                    {capitalizeStatus(b.status)}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {b.payment ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${PAYMENT_STATUS_COLOR[b.payment.status] ?? "bg-ink/5 text-ink/50 ring-1 ring-ink/10"}`}>
                      <span className={`w-1 h-1 rounded-full mr-1 ${PAYMENT_STATUS_DOT[b.payment.status] ?? "bg-ink/30"}`} />
                      {capitalizeStatus(b.payment.status)}
                    </span>
                  ) : <span className="text-[10px] text-ink/30 italic">—</span>}
                </td>
                <td className="px-3 py-3 text-[10px] font-mono">
                  <div className="space-y-0.5 min-w-0">
                    {b.payment?.gatewayOrderId ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-ink/30 shrink-0">O</span>
                        <span className="text-ink/60 truncate">{b.payment.gatewayOrderId.length > 10 ? b.payment.gatewayOrderId.slice(0, 8) + "…" : b.payment.gatewayOrderId}</span>
                      </div>
                    ) : null}
                    {b.payment?.gatewayPaymentId ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-ink/30 shrink-0">P</span>
                        <span className="text-ink/60 truncate">{b.payment.gatewayPaymentId.length > 10 ? b.payment.gatewayPaymentId.slice(0, 8) + "…" : b.payment.gatewayPaymentId}</span>
                      </div>
                    ) : (!b.payment?.gatewayOrderId ? <span className="text-ink/20 italic">—</span> : null)}
                  </div>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {b.payment ? (
                    <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                      ₹{Number(b.payment.amount).toLocaleString("en-IN")}
                    </span>
                  ) : <span className="text-[10px] text-ink/30 italic">—</span>}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <button
                  onClick={() => openEditor(b)}
                  disabled={b.status === 'CANCELLED'}
                  className="inline-flex items-center justify-center px-2 py-1 border border-sage/30 text-sage-dark rounded-md text-[10px] font-medium hover:bg-sage-light/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full">
                  Edit
                </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-sage/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-ink/40">
              Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30">
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, Math.min(page - 3, totalPages - 5)),
                Math.max(0, Math.min(page - 3, totalPages - 5)) + 5
              ).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    page === n
                      ? "bg-sage text-white border-sage shadow-soft"
                      : "text-ink/60 border-sage/20 hover:bg-sage-light/40"
                  }`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Slot Editor Modal ─────────────────────────────────────────── */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={closeEditor}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          {/* Modal */}
          <div className="relative bg-white rounded-3xl border border-sage/15 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-sage/10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Edit Slot</p>
                <h3 className="font-display text-xl text-ink">
                  Session with {editingBooking.counsellor.name}
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/50">
                  <span>Client: <span className="text-ink/80 font-medium">{editingBooking.visitorName}</span></span>
                  <span>Booking ID: <span className="font-mono">{editingBooking.id.slice(0, 8)}…</span></span>
                </div>
              </div>
              <button
                onClick={closeEditor}
                disabled={saveLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-ink/40 hover:text-ink hover:bg-sage-light/40 transition-colors disabled:opacity-30"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current slot summary */}
            <div className="px-6 py-4 bg-paper/40 border-b border-sage/10">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-mono uppercase text-ink/40 tracking-wider mb-0.5">Current Session</p>
                  <p className="text-ink font-medium">
                    {new Date(editingBooking.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="h-8 w-px bg-sage/15" />
                <div>
                  <p className="text-[10px] font-mono uppercase text-ink/40 tracking-wider mb-0.5">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${BOOKING_STATUS_COLOR[editingBooking.status] ?? "bg-ink/5 text-ink/50 ring-1 ring-ink/10"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${BOOKING_STATUS_DOT[editingBooking.status] ?? "bg-ink/30"}`} />
                    {capitalizeStatus(editingBooking.status)}
                  </span>
                </div>
                <div className="h-8 w-px bg-sage/15" />
                <div>
                  <p className="text-[10px] font-mono uppercase text-ink/40 tracking-wider mb-0.5">Duration</p>
                  <p className="text-ink font-medium">50 minutes</p>
                </div>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="px-6 pt-4">
              <div className="inline-flex rounded-xl bg-sage-light/30 p-1">
                <button
                  onClick={() => { setEditorTab('picker'); setSaveError(null); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${editorTab === 'picker' ? 'bg-white text-sage-dark shadow-soft' : 'text-ink/60 hover:text-ink'}`}
                >
                  Pick Available Slot
                </button>
                <button
                  onClick={() => { setEditorTab('custom'); setSaveError(null); setSelectedSlotId(null); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${editorTab === 'custom' ? 'bg-white text-sage-dark shadow-soft' : 'text-ink/60 hover:text-ink'}`}
                >
                  Set Custom Time
                </button>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {editorTab === 'picker' && (
                <div>
                  {slotsLoading ? (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-xl bg-sage-light/30 animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {availableSlots.map((s) => {
                        const selected = selectedSlotId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSlotId(s.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selected
                                ? 'bg-sage text-white border-sage shadow-soft'
                                : 'bg-paper/40 border-sage/15 hover:border-sage/40 text-ink'
                            }`}
                          >
                            <p className="text-xs font-mono font-medium">{s.date}</p>
                            <p className={`text-sm mt-0.5 ${selected ? 'opacity-90' : 'opacity-70'}`}>
                              {s.time} · {s.period}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-sm text-ink/50 mb-1">No open slots published for this counsellor.</p>
                      <p className="text-xs text-ink/30">
                        Switch to the <span className="font-medium text-ink/50">Set Custom Time</span> tab to create an ad-hoc session.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {editorTab === 'custom' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                      Start Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                    />
                    <p className="mt-1 text-[11px] text-ink/40">
                      {customStart
                        ? `= ${new Date(new Date(customStart).getTime() - new Date(customStart).getTimezoneOffset() * 60000).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'long' })} in your device's local time`
                        : 'Select a date and time'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                      End Date &amp; Time <span className="normal-case font-sans text-ink/30">(optional, defaults to +50 min)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                    />
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3">
                    <p className="text-xs text-amber-800">
                      <span className="font-semibold">Admin override.</span> Setting a custom time will automatically create
                      (or reuse) an availability slot for the counsellor at that exact time — even if within the 2-hour
                      notice window or outside their published schedule.
                    </p>
                  </div>
                </div>
              )}

              {/* Save error */}
              {saveError && (
                <div className="mt-4 bg-rose-50 border border-rose-200/60 rounded-xl px-4 py-3 text-sm text-rose-700">
                  {saveError}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-sage/10 flex items-center justify-between gap-3 bg-paper/30">
              <p className="text-xs text-ink/40">
                Changes will be logged to the platform audit trail.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closeEditor}
                  disabled={saveLoading}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSlot}
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl text-xs font-medium bg-sage text-white hover:bg-sage-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saveLoading && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {saveLoading ? 'Saving…' : 'Save Slot Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
