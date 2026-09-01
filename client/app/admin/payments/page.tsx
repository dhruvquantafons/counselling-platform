"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin-dev-secret";
function adminHeaders() { return { "x-admin-secret": ADMIN_SECRET, "Content-Type": "application/json" }; }

type Payment = {
  id: string;
  amount: number;
  status: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  createdAt: string;
  booking: {
    id: string;
    visitorName: string;
    visitorEmail: string;
    startTime: string;
    status: string;
    counsellor: { id: string; name: string };
  };
};

const STATUS_COLOR: Record<string, string> = {
  INITIATED: "bg-amber-50 text-amber-dark ring-1 ring-amber/20",
  SUCCESS: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
  FAILED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  REFUNDED: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
};
const STATUS_DOT: Record<string, string> = {
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
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments", active: true },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/counsellor-applications", label: "Applications" },
  { href: "/admin/audit", label: "Audit Log" },
];

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [refundLoading, setRefundLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API_BASE}/api/admin/payments?${params}`, { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed to load payments");
      const data = await res.json();
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e: any) { setError(e.message); setPayments([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  }

  async function processRefund(payment: Payment) {
    setRefundLoading(payment.id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/payments/${payment.id}/refund`, { method: "POST", headers: adminHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Refund failed");
      }
      showToast(`Refund processed for ₹${Number(payment.amount).toLocaleString("en-IN")} ✓`, "ok");
      setConfirmRefund(null);
      fetchPayments();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setRefundLoading(null); }
  }

  function exportCsv() {
    const rows = [
      ["Payment ID", "Booking ID", "Client", "Counsellor", "Amount", "Status", "Gateway Order ID", "Gateway Payment ID", "Session Date", "Created At"],
      ...payments.map((p) => [
        p.id, p.booking.id, p.booking.visitorName, p.booking.counsellor.name,
        `₹${Number(p.amount)}`, p.status,
        p.gatewayOrderId ?? "—", p.gatewayPaymentId ?? "—",
        new Date(p.booking.startTime).toLocaleString("en-IN"),
        new Date(p.createdAt).toLocaleString("en-IN"),
      ]),
    ];
    downloadCsv(rows, `payments-export.csv`);
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
    const shown = value.length > 14 ? value.slice(0, 12) + "…" : value;
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

  // Reconciliation mismatch: SUCCESS payment with no gateway ID
  function isMismatch(p: Payment) {
    return p.status === "SUCCESS" && !p.gatewayPaymentId;
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${toast.type === "ok" ? "bg-sage text-white" : "bg-rose-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Refund Confirm Modal */}
      {confirmRefund && (
        <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
            <h3 className="font-display text-lg text-ink mb-1">Process refund</h3>
            <p className="text-sm text-ink/50 mb-4">
              Refund <strong>₹{Number(confirmRefund.amount).toLocaleString("en-IN")}</strong> to <strong>{confirmRefund.booking.visitorName}</strong> via Razorpay?
              This will also cancel the booking.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRefund(null)}
                className="flex-1 border border-sage/20 rounded-xl py-2 text-sm text-ink/60 hover:bg-sage-light/40 transition-colors">
                Cancel
              </button>
              <button onClick={() => processRefund(confirmRefund)} disabled={!!refundLoading}
                className="flex-1 bg-rose-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-60">
                {refundLoading ? "Processing…" : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Platform Admin</p>
          <h1 className="font-display text-2xl text-ink">Payment Register</h1>
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
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-5 mb-6 flex flex-wrap items-center gap-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20">
          <option value="">All Statuses</option>
          {["INITIATED","SUCCESS","FAILED","REFUNDED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={exportCsv} disabled={loading || payments.length === 0}
          className="ml-auto flex items-center gap-1.5 border border-sage/20 text-ink/70 px-4 py-2 rounded-xl text-xs font-medium hover:bg-sage-light/40 transition-colors disabled:opacity-40">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200/60 rounded-xl px-4 py-3 text-sm text-rose-700 mb-6">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-sage/10 bg-paper/40">
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Pay ID</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Client</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Counsellor</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Session</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Status</th>
              <th className="text-left px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide truncate">Gateway</th>
              <th className="text-right px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Amount</th>
              <th className="text-right px-3 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="px-3 py-3"><div className="h-3 bg-sage-light/40 rounded w-3/4" /></td>
                ))}
              </tr>
            ))}
            {!loading && payments.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-ink/40">No payments found.</td></tr>
            )}
            {!loading && payments.map((p) => (
              <tr key={p.id} className={`hover:bg-sage-light/20 transition-colors ${isMismatch(p) ? "bg-rose-50/60 border-l-2 border-l-rose-400" : ""}`}>
                <td className="px-3 py-3">
                  <CopyChip value={p.id} label={"pid" + p.id} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center font-display text-[11px] text-sage-dark shrink-0 ring-1 ring-sage/10">
                      {(p.booking?.visitorName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-ink text-xs truncate">{p.booking?.visitorName}</p>
                      <p className="text-[10px] text-ink/45 truncate">{p.booking?.visitorEmail}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink/70 text-xs truncate">{p.booking?.counsellor?.name || "—"}</td>
                <td className="px-3 py-3 text-ink/70 text-[11px] whitespace-nowrap">
                  {p.booking?.startTime ? (
                    <>
                      {new Date(p.booking.startTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      <span className="text-ink/30 mx-0.5">·</span>
                      <span className="font-mono text-[10px]">
                        {new Date(p.booking.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </>
                  ) : "—"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${STATUS_COLOR[p.status] ?? "bg-ink/5 text-ink/50 ring-1 ring-ink/10"}`}>
                      <span className={`w-1 h-1 rounded-full mr-1 ${STATUS_DOT[p.status] ?? "bg-ink/30"}`} />
                      {capitalizeStatus(p.status)}
                    </span>
                    {isMismatch(p) && (
                      <span title="Reconciliation mismatch" className="inline-flex items-center px-1 py-0.5 rounded-md bg-rose-50 ring-1 ring-rose-200/60 text-rose-700 text-[9px] font-semibold">
                        !
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-[10px] font-mono">
                  <div className="space-y-0.5 min-w-0">
                    {p.gatewayOrderId ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-ink/30 shrink-0">O</span>
                        <span className="text-ink/60 truncate">{p.gatewayOrderId.length > 10 ? p.gatewayOrderId.slice(0, 8) + "…" : p.gatewayOrderId}</span>
                      </div>
                    ) : null}
                    {p.gatewayPaymentId ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-ink/30 shrink-0">P</span>
                        <span className="text-ink/60 truncate">{p.gatewayPaymentId.length > 10 ? p.gatewayPaymentId.slice(0, 8) + "…" : p.gatewayPaymentId}</span>
                      </div>
                    ) : (!p.gatewayOrderId ? <span className="text-ink/20 italic">—</span> : null)}
                  </div>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
                  </span>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {p.status === "SUCCESS" && (
                    <button onClick={() => setConfirmRefund(p)} disabled={!!refundLoading}
                      className="inline-flex items-center justify-center px-2 py-1 border border-rose-200 text-rose-700 text-[10px] font-semibold rounded-md hover:bg-rose-50 transition-colors disabled:opacity-50 w-full">
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-sage/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-ink/40">Showing {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} of {total}</p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30">← Prev</button>
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
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
