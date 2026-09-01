"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin-dev-secret";

function adminHeaders() {
  return { "x-admin-secret": ADMIN_SECRET, "Content-Type": "application/json" };
}

type CounsellorStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REMOVED";

type AdminCounsellor = {
  id: string;
  name: string;
  email: string;
  specialisation: string;
  languages: string[];
  fee: number;
  bio: string | null;
  approved: boolean;
  status: CounsellorStatus;
  createdAt: string;
  _count: { bookings: number };
};

const STATUS_TABS: { label: string; value: CounsellorStatus }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Removed", value: "REMOVED" },
];

const STATUS_BADGE: Record<CounsellorStatus, string> = {
  PENDING: "bg-amber-50 text-amber-dark ring-1 ring-amber/20",
  ACTIVE: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
  SUSPENDED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  REMOVED: "bg-ink/5 text-ink/50 ring-1 ring-ink/10",
};
const STATUS_DOT: Record<CounsellorStatus, string> = {
  PENDING: "bg-amber",
  ACTIVE: "bg-sage",
  SUSPENDED: "bg-rose-500",
  REMOVED: "bg-ink/30",
};

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/counsellors", label: "Counsellors", active: true },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/counsellor-applications", label: "Applications" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default function AdminCounsellorsPage() {
  const [tab, setTab] = useState<CounsellorStatus>("PENDING");
  const [counsellors, setCounsellors] = useState<AdminCounsellor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [suspendModal, setSuspendModal] = useState<{ id: string; name: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [addCounsellorOpen, setAddCounsellorOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const emptyForm = {
    name: "",
    email: "",
    phone: "",
    specialisation: "",
    qualifications: "",
    languages: "" as string,
    fee: "" as string,
    bio: "",
  };
  const [addForm, setAddForm] = useState(emptyForm);

  const fetchCounsellors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: tab, page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`${API_BASE}/api/admin/counsellors?${params}`, { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed to load counsellors");
      const data = await res.json();
      setCounsellors(Array.isArray(data?.counsellors) ? data.counsellors : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e: any) {
      setError(e.message);
      setCounsellors([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { fetchCounsellors(); }, [fetchCounsellors]);
  const totalPages = Math.ceil(total / pageSize);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function doAction(id: string, action: "approve" | "reject" | "restore" | "remove", reason?: string) {
    setActionLoading(id + action);
    try {
      const isDelete = action === "remove";
      const url = isDelete
        ? `${API_BASE}/api/admin/counsellors/${id}`
        : `${API_BASE}/api/admin/counsellors/${id}/${action}`;
      const res = await fetch(url, {
        method: isDelete ? "DELETE" : "PATCH",
        headers: adminHeaders(),
        body: undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Action failed");
      }
      showToast(
        action === "approve" ? "Counsellor approved ✓" :
        action === "reject"  ? "Application rejected" :
        action === "restore" ? "Counsellor restored ✓" :
        "Counsellor removed",
        "ok"
      );
      fetchCounsellors();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally {
      setActionLoading(null);
    }
  }

  async function doSuspend() {
    if (!suspendModal) return;
    setActionLoading(suspendModal.id + "suspend");
    try {
      const res = await fetch(`${API_BASE}/api/admin/counsellors/${suspendModal.id}/suspend`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ reason: suspendReason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Suspend failed");
      }
      showToast("Counsellor suspended", "ok");
      setSuspendModal(null);
      setSuspendReason("");
      fetchCounsellors();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddCounsellorSubmit() {
    setAddLoading(true);
    setAddError(null);
    try {
      const languagesArr = addForm.languages
        .split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      if (languagesArr.length === 0) {
        throw new Error('At least one language is required (comma-separated)');
      }
      const payload = {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim() || undefined,
        specialisation: addForm.specialisation.trim(),
        qualifications: addForm.qualifications.trim() || undefined,
        languages: languagesArr,
        fee: Number(addForm.fee),
        bio: addForm.bio.trim() || undefined,
      };
      const res = await fetch(`${API_BASE}/api/admin/counsellors`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      let errMsg: string | null = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        errMsg = data?.error || null;
      } else {
        const text = await res.text().catch(() => '');
        errMsg = text ? text.slice(0, 300) : null;
      }
      if (!res.ok) {
        throw new Error(errMsg || `Request failed with status ${res.status}`);
      }
      const data = await res.json().catch(() => ({ counsellor: { name: 'New counsellor' } }));
      showToast(`Counsellor ${data.counsellor?.name || ''} created ✓`, 'ok');
      setAddCounsellorOpen(false);
      setAddForm(emptyForm);
      setAddError(null);
      // Jump to ACTIVE tab to show the new counsellor
      setTab("ACTIVE");
    } catch (e: any) {
      setAddError(e.message || 'Unknown error');
    } finally {
      setAddLoading(false);
    }
  }

  const isActing = (id: string, ...actions: string[]) =>
    actions.some((a) => actionLoading === id + a);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  function copyId(id: string) {
    copyToClipboard(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId((x) => (x === id ? null : x)), 1800);
  }

  const statusLabel = (s: CounsellorStatus) =>
    s === "PENDING" ? "Pending" : s === "ACTIVE" ? "Active" : s === "SUSPENDED" ? "Suspended" : "Removed";

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === "ok" ? "bg-sage text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
            <h3 className="font-display text-lg text-ink mb-1">Suspend counsellor</h3>
            <p className="text-sm text-ink/50 mb-4">Suspending <strong>{suspendModal.name}</strong>. Optionally add a reason.</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (optional)"
              rows={3}
              className="w-full border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-sage/20 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setSuspendModal(null); setSuspendReason(""); }}
                className="flex-1 border border-sage/20 rounded-xl py-2 text-sm text-ink/60 hover:bg-sage-light/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doSuspend}
                disabled={!!actionLoading}
                className="flex-1 bg-rose-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {actionLoading ? "Suspending…" : "Confirm Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Platform Admin</p>
          <h1 className="font-display text-2xl text-ink">Counsellors</h1>
        </div>
        <nav className="flex flex-wrap gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                l.active ? "bg-sage text-white shadow-soft" : "text-ink/75 hover:text-ink hover:bg-sage-light/60 bg-sage-light/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Status Tabs + Add Button */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-paper rounded-xl p-1 w-fit border border-sage/10">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors ${
                tab === t.value
                  ? "bg-white text-ink shadow-soft border border-sage/10"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setAddCounsellorOpen(true); setAddError(null); setAddForm(emptyForm); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-sage text-white rounded-xl text-xs font-medium hover:bg-sage-dark transition-colors shadow-soft"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Counsellor
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200/60 rounded-xl px-4 py-3 text-sm text-rose-700 mb-6">{error}</div>
      )}

      {/* Counsellor List */}
      {loading && (
        <div className="bg-white rounded-2xl border border-sage/10 shadow-soft divide-y divide-sage/10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 flex gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-sage-light/50 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-sage-light/50 rounded w-1/3" />
                <div className="h-3 bg-sage-light/30 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && counsellors.length === 0 && (
        <div className="bg-white rounded-2xl border border-sage/10 shadow-soft px-6 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-sm text-ink/50">No {tab.toLowerCase()} counsellors found.</p>
        </div>
      )}

      {!loading && counsellors.length > 0 && (
        <>
          <div className="bg-white rounded-2xl border border-sage/10 shadow-soft divide-y divide-sage/10">
            {counsellors.map((c) => (
              <div key={c.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-sage-light/20 transition-colors">
                {/* Avatar + info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center font-display text-base text-sage-dark shrink-0 ring-2 ring-sage/10">
                    {(c.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-ink">{c.name}</p>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${STATUS_BADGE[c.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_DOT[c.status]}`} />
                        {statusLabel(c.status)}
                      </span>
                    </div>
                    <p className="text-xs text-ink/55 mt-0.5">{c.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-ink/55">
                      <span>{c.specialisation}</span>
                      <span className="text-ink/20">·</span>
                      <span className="tabular-nums">₹{Number(c.fee).toLocaleString("en-IN")}/session</span>
                      <span className="text-ink/20">·</span>
                      <span>{c._count?.bookings ?? 0} bookings</span>
                      <span className="text-ink/20">·</span>
                      <span>Joined {new Date(c.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                      <button
                        onClick={() => copyId(c.id)}
                        title="Copy counsellor ID"
                        className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] ring-1 ring-sage/10 bg-paper hover:bg-white hover:ring-sage/30 transition-colors"
                      >
                        <span className="text-ink/40 group-hover:text-ink/60 transition-colors">{c.id.slice(0, 8)}…</span>
                        {copiedId === c.id ? (
                          <svg className="w-2.5 h-2.5 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5 text-ink/30 group-hover:text-ink/60 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {c.bio && (
                      <p className="text-xs text-ink/45 mt-1.5 line-clamp-2 max-w-xl">{c.bio}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Array.isArray(c.languages) ? c.languages : []).map((lang) => (
                        <span key={lang} className="bg-paper border border-sage/10 text-ink/65 text-[10px] px-2 py-0.5 rounded-full font-mono">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {c.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => doAction(c.id, "approve")}
                        disabled={isActing(c.id, "approve", "reject")}
                        className="px-4 py-2 bg-sage text-white text-xs font-medium rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {isActing(c.id, "approve") ? <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" /> : null}
                        Approve
                      </button>
                      <button
                        onClick={() => doAction(c.id, "reject")}
                        disabled={isActing(c.id, "approve", "reject")}
                        className="px-4 py-2 border border-rose-200 text-rose-600 text-xs font-medium rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {c.status === "ACTIVE" && (
                    <>
                      <button
                        onClick={() => setSuspendModal({ id: c.id, name: c.name })}
                        disabled={!!actionLoading}
                        className="px-4 py-2 border border-amber/30 text-amber text-xs font-medium rounded-xl hover:bg-amber-light transition-colors disabled:opacity-60"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => doAction(c.id, "remove")}
                        disabled={!!actionLoading}
                        className="px-4 py-2 border border-rose-200 text-rose-600 text-xs font-medium rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </>
                  )}
                  {c.status === "SUSPENDED" && (
                    <>
                      <button
                        onClick={() => doAction(c.id, "restore")}
                        disabled={isActing(c.id, "restore")}
                        className="px-4 py-2 bg-sage text-white text-xs font-medium rounded-xl hover:bg-sage-dark transition-colors disabled:opacity-60"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => doAction(c.id, "remove")}
                        disabled={!!actionLoading}
                        className="px-4 py-2 border border-rose-200 text-rose-600 text-xs font-medium rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </>
                  )}
                  {c.status === "REMOVED" && (
                    <span className="text-xs text-ink/30 italic px-2">No actions available</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 bg-white rounded-2xl border border-sage/10 shadow-soft px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-ink/40">
                Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total} {tab.toLowerCase()} counsellors
              </p>
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30"
                >
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
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add Counsellor Modal ──────────────────────────────────────── */}
      {addCounsellorOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={() => { if (!addLoading) { setAddCounsellorOpen(false); setAddError(null); } }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          {/* Modal */}
          <div className="relative bg-white rounded-3xl border border-sage/15 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3)] w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-fade-in-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-sage/10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Create Counsellor</p>
                <h3 className="font-display text-xl text-ink">Add new counsellor</h3>
                <p className="text-xs text-ink/50 mt-1">
                  Account will be created as <span className="font-medium text-sage-dark">approved & ACTIVE</span> — no approval queue.
                </p>
              </div>
              <button
                onClick={() => { if (!addLoading) { setAddCounsellorOpen(false); setAddError(null); } }}
                disabled={addLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-ink/40 hover:text-ink hover:bg-sage-light/40 transition-colors disabled:opacity-30"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Full name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Dr. Priya Sharma"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Phone <span className="text-ink/30 normal-case">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+91 98xxx xxxxx"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Specialisation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.specialisation}
                    onChange={(e) => setAddForm({ ...addForm, specialisation: e.target.value })}
                    placeholder="Clinical Psychology, CBT, etc."
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Session fee (INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={addForm.fee}
                    onChange={(e) => setAddForm({ ...addForm, fee: e.target.value })}
                    placeholder="1500"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Languages <span className="text-rose-500">*</span>{" "}
                    <span className="text-ink/30 normal-case">comma or semicolon separated</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.languages}
                    onChange={(e) => setAddForm({ ...addForm, languages: e.target.value })}
                    placeholder="English, Hindi, Tamil"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Qualifications <span className="text-ink/30 normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.qualifications}
                    onChange={(e) => setAddForm({ ...addForm, qualifications: e.target.value })}
                    placeholder="M.Phil (Clinical Psychology), RCI Licensed"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-ink/40 uppercase tracking-wider mb-1.5">
                    Bio <span className="text-ink/30 normal-case">(optional)</span>
                  </label>
                  <textarea
                    value={addForm.bio}
                    onChange={(e) => setAddForm({ ...addForm, bio: e.target.value })}
                    rows={3}
                    placeholder="Short public-facing profile summary"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20 resize-none"
                  />
                </div>
              </div>

              {/* Error banner */}
              {addError && (
                <div className="mt-2 bg-rose-50 border border-rose-200/60 rounded-xl px-4 py-3 text-sm text-rose-700">
                  {addError}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-sage/10 flex items-center justify-between gap-3 bg-paper/30">
              <p className="text-xs text-ink/40">
                Counsellor login uses the email above; 2FA demo code is <span className="font-mono text-ink/60">123456</span>.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (!addLoading) { setAddCounsellorOpen(false); setAddError(null); } }}
                  disabled={addLoading}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ink/60 border border-sage/20 hover:bg-sage-light/40 transition-colors disabled:opacity-30"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCounsellorSubmit}
                  disabled={addLoading}
                  className="px-5 py-2 rounded-xl text-xs font-medium bg-sage text-white hover:bg-sage-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {addLoading ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {addLoading ? "Creating…" : "Create Counsellor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
