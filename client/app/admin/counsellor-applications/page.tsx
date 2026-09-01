"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin-dev-secret";
function adminHeaders() {
  return { "x-admin-secret": ADMIN_SECRET, "Content-Type": "application/json" };
}

type Application = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  qualifications: string;
  yearsOfExperience: number;
  specialisation: string;
  bio: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  APPROVED: "bg-sage-light text-sage-dark ring-1 ring-sage/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
};
const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber",
  APPROVED: "bg-sage",
  REJECTED: "bg-rose-500",
};

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/counsellors", label: "Counsellors" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/counsellor-applications", label: "Applications", active: true },
  { href: "/admin/audit", label: "Audit Log" },
];

export default function CounsellorApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API_BASE}/api/admin/counsellor-applications?${params}`, {
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.total || 0);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setReviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/counsellor-applications/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status, reviewNotes }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Failed");
      }
      showToast(`Application ${status.toLowerCase()} ✓`, "ok");
      setSelected(null);
      setReviewNotes("");
      fetchApplications();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally {
      setReviewLoading(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${toast.type === "ok" ? "bg-sage text-white" : "bg-rose-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Platform Admin</p>
          <h1 className="font-display text-2xl text-ink">Counsellor Applications</h1>
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

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-5 mb-6 flex items-center gap-4">
        <p className="text-xs font-mono text-ink/40 uppercase tracking-wide shrink-0">Status</p>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <p className="text-xs text-ink/40 ml-auto">{total} total</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sage/10 bg-paper/40">
              <th className="text-left px-5 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Applicant</th>
              <th className="text-left px-5 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Specialisation</th>
              <th className="text-left px-5 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Exp.</th>
              <th className="text-left px-5 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide">Submitted</th>
              <th className="text-right px-5 py-3 text-[10px] font-mono text-ink/40 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/10">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-3 bg-sage-light/40 rounded w-3/4" /></td>
                ))}
              </tr>
            ))}
            {!loading && applications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-ink/40">
                  No applications found.
                </td>
              </tr>
            )}
            {!loading && applications.map((a) => (
              <tr key={a.id} className="hover:bg-sage-light/10 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center font-display text-xs text-sage-dark shrink-0">
                      {a.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-ink text-sm">{a.fullName}</p>
                      <p className="text-xs text-ink/45">{a.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-ink/70">{a.specialisation}</td>
                <td className="px-5 py-4 text-sm text-ink/70">{a.yearsOfExperience} yr{a.yearsOfExperience !== 1 ? "s" : ""}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLE[a.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[a.status]}`} />
                    {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-ink/45 font-mono">
                  {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => { setSelected(a); setReviewNotes(a.reviewNotes || ""); }}
                    className="px-3 py-1.5 border border-sage/20 text-ink/70 text-xs rounded-lg hover:bg-sage-light/40 transition-colors"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-sage/10 flex items-center justify-between gap-3">
            <p className="text-xs text-ink/40">
              {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 disabled:opacity-30">← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, Math.min(page - 3, totalPages - 5)),
                Math.max(0, Math.min(page - 3, totalPages - 5)) + 5
              ).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium border transition-colors ${page === n ? "bg-sage text-white border-sage" : "text-ink/60 border-sage/20 hover:bg-sage-light/40"}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail / Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="px-6 py-5 border-b border-sage/10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Application Review</p>
                <h2 className="font-display text-xl text-ink">{selected.fullName}</h2>
                <p className="text-sm text-ink/50">{selected.email} · {selected.phone}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink/40 hover:text-ink hover:bg-sage-light/40 transition-colors shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-paper/60 rounded-xl p-3">
                  <p className="text-[10px] font-mono text-ink/40 uppercase mb-1">Specialisation</p>
                  <p className="text-sm text-ink">{selected.specialisation}</p>
                </div>
                <div className="bg-paper/60 rounded-xl p-3">
                  <p className="text-[10px] font-mono text-ink/40 uppercase mb-1">Experience</p>
                  <p className="text-sm text-ink">{selected.yearsOfExperience} years</p>
                </div>
                <div className="bg-paper/60 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] font-mono text-ink/40 uppercase mb-1">Qualifications</p>
                  <p className="text-sm text-ink">{selected.qualifications}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-mono text-ink/40 uppercase mb-2">Bio</p>
                <p className="text-sm text-ink/75 leading-relaxed bg-paper/40 rounded-xl p-4 border border-sage/10 whitespace-pre-wrap">{selected.bio}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[selected.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status]}`} />
                  {selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}
                </span>
                <span className="text-xs text-ink/40">
                  Submitted {new Date(selected.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </span>
                {selected.reviewedAt && (
                  <span className="text-xs text-ink/40">
                    · Reviewed {new Date(selected.reviewedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                )}
              </div>

              {/* Review notes */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Review notes <span className="text-ink/35 font-normal">(optional)</span></label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes about this application…"
                  className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-sage/20"
                />
              </div>

              {/* Actions */}
              {selected.status === "PENDING" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => review(selected.id, "APPROVED")}
                    disabled={reviewLoading}
                    className="flex-1 bg-sage text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sage-dark transition-colors disabled:opacity-60"
                  >
                    {reviewLoading ? "Saving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => review(selected.id, "REJECTED")}
                    disabled={reviewLoading}
                    className="flex-1 border border-rose-200 text-rose-600 rounded-xl py-2.5 text-sm font-medium hover:bg-rose-50 transition-colors disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
              {selected.status !== "PENDING" && (
                <div className="bg-sage-light/30 rounded-xl px-4 py-3 text-sm text-ink/60 text-center">
                  This application has already been <strong>{selected.status.toLowerCase()}</strong>.
                  {selected.reviewNotes && <p className="mt-1 text-xs italic">"{selected.reviewNotes}"</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
