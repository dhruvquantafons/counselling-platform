"use client";

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin-dev-secret";
function adminHeaders() { return { "x-admin-secret": ADMIN_SECRET }; }

type AuditLog = {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
};

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/counsellors", label: "Counsellors" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/counsellor-applications", label: "Applications" },
  { href: "/admin/audit", label: "Audit Log", active: true },
];

const ACTION_COLOR: Record<string, string> = {
  APPROVE_COUNSELLOR: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
  REJECT_COUNSELLOR: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  SUSPEND_COUNSELLOR: "bg-amber-50 text-amber-dark ring-1 ring-amber/20",
  RESTORE_COUNSELLOR: "bg-sage-50 text-sage-dark ring-1 ring-sage/20",
  REMOVE_COUNSELLOR: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  EDIT_BOOKING_SLOT: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
  REFUND_PAYMENT: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  CREATE_STATIC_PAGE: "bg-ink/5 text-ink/70 ring-1 ring-ink/10",
  EDIT_STATIC_PAGE: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
  DELETE_STATIC_PAGE: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  CREATE_FAQ: "bg-ink/5 text-ink/70 ring-1 ring-ink/10",
  EDIT_FAQ: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
  DELETE_FAQ: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
};
const ACTION_DOT: Record<string, string> = {
  APPROVE_COUNSELLOR: "bg-sage",
  REJECT_COUNSELLOR: "bg-rose-500",
  SUSPEND_COUNSELLOR: "bg-amber",
  RESTORE_COUNSELLOR: "bg-sage",
  REMOVE_COUNSELLOR: "bg-rose-500",
  EDIT_BOOKING_SLOT: "bg-sky-500",
  REFUND_PAYMENT: "bg-violet-500",
  CREATE_STATIC_PAGE: "bg-ink/40",
  EDIT_STATIC_PAGE: "bg-sky-500",
  DELETE_STATIC_PAGE: "bg-rose-500",
  CREATE_FAQ: "bg-ink/40",
  EDIT_FAQ: "bg-sky-500",
  DELETE_FAQ: "bg-rose-500",
};

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      const res = await fetch(`${API_BASE}/api/admin/audit-log?${params}`, { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed to load audit log");
      const data = await res.json();
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e: any) {
      setError(e.message);
      setLogs([]);
      setTotal(0);
    }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function exportCsv() {
    const rows = [
      ["Timestamp", "Actor", "Action", "Target Type", "Target ID", "Detail"],
      ...logs.map((l) => [
        new Date(l.createdAt).toLocaleString("en-IN"),
        l.actor, l.action, l.targetType, l.targetId, l.detail ?? "—",
      ]),
    ];
    downloadCsv(rows, `audit-log-export.csv`);
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

  const TARGET_ICON: Record<string, React.ReactElement> = {
    COUNSELLOR: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    BOOKING: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    PAYMENT: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    STATIC_PAGE: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    FAQ: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  };

  const targetTypeLabel = (t: string) => {
    const m: Record<string, string> = { COUNSELLOR: "Counsellor", BOOKING: "Booking", PAYMENT: "Payment", STATIC_PAGE: "Page", FAQ: "FAQ" };
    return m[t] || t.charAt(0) + t.slice(1).toLowerCase();
  };
  const targetTypeColor = (t: string) => {
    const m: Record<string, string> = {
      COUNSELLOR: "text-sage-dark bg-sage-50 ring-1 ring-sage/20",
      BOOKING:    "text-sky-700 bg-sky-50 ring-1 ring-sky-200/60",
      PAYMENT:    "text-violet-700 bg-violet-50 ring-1 ring-violet-200/60",
      STATIC_PAGE:"text-ink/60 bg-ink/5 ring-1 ring-ink/10",
      FAQ:        "text-amber-dark bg-amber-50 ring-1 ring-amber/20",
    };
    return m[t] || "text-ink/50 bg-paper ring-1 ring-sage/10";
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-ink/40 uppercase tracking-widest mb-1">Platform Admin</p>
          <h1 className="font-display text-2xl text-ink">Audit Log</h1>
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

      {/* Search + Export */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-5 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search actions, targets, details…"
              className="w-full border border-sage/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink bg-paper/50 focus:outline-none focus:ring-2 focus:ring-sage/20"
            />
          </div>
          <button type="submit"
            className="bg-sage text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-sage-dark transition-colors">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="border border-sage/20 text-ink/60 px-4 py-2.5 rounded-xl text-sm hover:bg-sage-light/40 transition-colors">
              Clear
            </button>
          )}
          <button type="button" onClick={exportCsv} disabled={loading || logs.length === 0}
            className="flex items-center gap-1.5 border border-sage/20 text-ink/70 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-sage-light/40 transition-colors disabled:opacity-40">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
        </form>
        {total > 0 && (
          <p className="text-xs text-ink/40 mt-3">{total} entries{search ? ` matching "${search}"` : ""}</p>
        )}
      </div>

      {error && <div className="bg-rose-50 border border-rose-200/60 rounded-xl px-4 py-3 text-sm text-rose-700 mb-6">{error}</div>}

      {/* Log Table */}
      <div className="bg-white rounded-2xl border border-sage/10 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sage/10">
                <th className="text-left px-5 py-3.5 text-xs font-mono text-ink/40 uppercase tracking-wide">Timestamp</th>
                <th className="text-left px-5 py-3.5 text-xs font-mono text-ink/40 uppercase tracking-wide">Actor</th>
                <th className="text-left px-5 py-3.5 text-xs font-mono text-ink/40 uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3.5 text-xs font-mono text-ink/40 uppercase tracking-wide">Target</th>
                <th className="text-left px-5 py-3.5 text-xs font-mono text-ink/40 uppercase tracking-wide">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/10">
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-3 bg-sage-light/40 rounded w-3/4" /></td>
                  ))}
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                    </div>
                    <p className="text-sm text-ink/40">{search ? `No entries matching "${search}"` : "No audit log entries yet."}</p>
                  </td>
                </tr>
              )}
              {!loading && logs.map((log) => (
                <tr key={log.id} className="hover:bg-sage-light/20 transition-colors align-top">
                  <td className="px-5 py-3.5 text-xs text-ink/55 font-mono whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    <span className="text-ink/25 mx-1">·</span>
                    <span className="font-mono text-[11px] text-ink/65">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/75">
                      <span className="w-5 h-5 rounded-full bg-sage-light text-sage-dark flex items-center justify-center text-[10px] font-bold shrink-0 ring-1 ring-sage/10">
                        {(log.actor || "?")[0]?.toUpperCase()}
                      </span>
                      <span className="truncate max-w-[160px]" title={log.actor}>{log.actor || "—"}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${ACTION_COLOR[log.action] ?? "bg-ink/5 text-ink/50 ring-1 ring-ink/10"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ACTION_DOT[log.action] ?? "bg-ink/30"}`} />
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${targetTypeColor(log.targetType)}`}>
                        <span className="opacity-75">{TARGET_ICON[log.targetType] ?? null}</span>
                        {targetTypeLabel(log.targetType)}
                      </span>
                      {log.targetType === "COUNSELLOR" ? (
                        <Link
                          href={`/admin/counsellors`}
                          title={`Open counsellors list (ID: ${log.targetId})`}
                          className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ring-1 ring-sage/15 bg-sage-50/50 hover:bg-sage-50 hover:ring-sage/30 transition-colors"
                        >
                          <span className="font-mono text-[11px] text-sage-dark/80 group-hover:text-sage-dark transition-colors max-w-[140px] truncate" title={log.targetId}>
                            {(log.targetId || "").length > 12 ? (log.targetId || "").slice(0, 10) + "…" : (log.targetId || "—")}
                          </span>
                          <svg className="w-2.5 h-2.5 text-sage/60 group-hover:text-sage-dark transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </Link>
                      ) : (
                        <CopyChip value={log.targetId} label={"tgt" + log.targetId} />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-ink/65 max-w-md">
                    {log.detail ? (
                      <span className="line-clamp-2 block py-0.5" title={log.detail}>{log.detail}</span>
                    ) : <span className="text-ink/25 italic">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-sage/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-ink/40">Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</p>
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
