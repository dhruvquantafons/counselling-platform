"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin-dev-secret";
function adminHeaders() { return { "x-admin-secret": ADMIN_SECRET, "Content-Type": "application/json" }; }

type StaticPage = { id: string; slug: string; title: string; body: string; createdAt: string; updatedAt: string };
type Faq = { id: string; question: string; answer: string; order: number; createdAt: string };

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/counsellors", label: "Counsellors" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/content", label: "Content", active: true },
  { href: "/admin/audit", label: "Audit Log" },
];

export default function AdminContentPage() {
  const [tab, setTab] = useState<"pages" | "faqs">("pages");
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Page form state
  const [pageForm, setPageForm] = useState<{ id?: string; slug: string; title: string; body: string }>({ slug: "", title: "", body: "" });
  const [pageFormOpen, setPageFormOpen] = useState(false);
  const [pageFormLoading, setPageFormLoading] = useState(false);

  // FAQ form state
  const [faqForm, setFaqForm] = useState<{ id?: string; question: string; answer: string; order: number }>({ question: "", answer: "", order: 0 });
  const [faqFormOpen, setFaqFormOpen] = useState(false);
  const [faqFormLoading, setFaqFormLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  }

  const fetchPages = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/static-pages`, { headers: adminHeaders() });
    if (res.ok) setPages(await res.json());
  }, []);

  const fetchFaqs = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/faqs`, { headers: adminHeaders() });
    if (res.ok) setFaqs(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPages(), fetchFaqs()]).finally(() => setLoading(false));
  }, [fetchPages, fetchFaqs]);

  // Static page CRUD
  async function submitPage() {
    setPageFormLoading(true);
    try {
      const url = pageForm.id ? `${API_BASE}/api/admin/static-pages/${pageForm.id}` : `${API_BASE}/api/admin/static-pages`;
      const res = await fetch(url, {
        method: pageForm.id ? "PATCH" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ slug: pageForm.slug, title: pageForm.title, body: pageForm.body }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "Failed"); }
      showToast(pageForm.id ? "Page updated ✓" : "Page created ✓", "ok");
      setPageFormOpen(false);
      setPageForm({ slug: "", title: "", body: "" });
      fetchPages();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setPageFormLoading(false); }
  }

  async function deletePage(id: string) {
    setDeleteLoading(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/static-pages/${id}`, { method: "DELETE", headers: adminHeaders() });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Page deleted", "ok"); fetchPages();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setDeleteLoading(null); }
  }

  // FAQ CRUD
  async function submitFaq() {
    setFaqFormLoading(true);
    try {
      const url = faqForm.id ? `${API_BASE}/api/admin/faqs/${faqForm.id}` : `${API_BASE}/api/admin/faqs`;
      const res = await fetch(url, {
        method: faqForm.id ? "PATCH" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ question: faqForm.question, answer: faqForm.answer, order: faqForm.order }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "Failed"); }
      showToast(faqForm.id ? "FAQ updated ✓" : "FAQ created ✓", "ok");
      setFaqFormOpen(false);
      setFaqForm({ question: "", answer: "", order: 0 });
      fetchFaqs();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setFaqFormLoading(false); }
  }

  async function deleteFaq(id: string) {
    setDeleteLoading(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/faqs/${id}`, { method: "DELETE", headers: adminHeaders() });
      if (!res.ok) throw new Error("Delete failed");
      showToast("FAQ deleted", "ok"); fetchFaqs();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setDeleteLoading(null); }
  }

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
          <h1 className="font-display text-2xl text-ink">Content Management</h1>
        </div>
        <nav className="flex flex-wrap gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${l.active ? "bg-sage text-white" : "text-ink/60 hover:text-ink hover:bg-sage-light/50"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-paper rounded-xl p-1 mb-6 w-fit border border-sage/10">
        {[{ v: "pages", label: "Static Pages" }, { v: "faqs", label: "FAQs" }].map((t) => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors ${tab === t.v ? "bg-white text-ink shadow-soft border border-sage/10" : "text-ink/50 hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Static Pages ── */}
      {tab === "pages" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setPageForm({ slug: "", title: "", body: "" }); setPageFormOpen(true); }}
              className="bg-sage text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-sage-dark transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Page
            </button>
          </div>

          {/* Page Form Modal */}
          {pageFormOpen && (
            <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up">
                <h3 className="font-display text-lg text-ink mb-4">{pageForm.id ? "Edit Page" : "New Static Page"}</h3>
                <div className="space-y-3">
                  <input value={pageForm.slug} onChange={(e) => setPageForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="Slug (e.g. about, terms, privacy)"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/20" />
                  <input value={pageForm.title} onChange={(e) => setPageForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Page Title"
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/20" />
                  <textarea value={pageForm.body} onChange={(e) => setPageForm((f) => ({ ...f, body: e.target.value }))}
                    placeholder="Page body / content (Markdown or plain text)"
                    rows={8}
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink font-mono resize-y focus:outline-none focus:ring-2 focus:ring-sage/20" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setPageFormOpen(false)}
                    className="flex-1 border border-sage/20 rounded-xl py-2 text-sm text-ink/60 hover:bg-sage-light/40 transition-colors">
                    Cancel
                  </button>
                  <button onClick={submitPage} disabled={pageFormLoading || !pageForm.slug || !pageForm.title || !pageForm.body}
                    className="flex-1 bg-sage text-white rounded-xl py-2 text-sm font-medium hover:bg-sage-dark transition-colors disabled:opacity-60">
                    {pageFormLoading ? "Saving…" : pageForm.id ? "Update Page" : "Create Page"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-8 text-center text-sm text-ink/40">Loading…</div>}
          {!loading && pages.length === 0 && (
            <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-12 text-center text-sm text-ink/40">
              No static pages yet. Create your first page above.
            </div>
          )}
          {!loading && pages.map((page) => (
            <div key={page.id} className="bg-white rounded-2xl border border-sage/10 shadow-soft p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs bg-paper border border-sage/10 px-2 py-0.5 rounded text-ink/60">/{page.slug}</span>
                </div>
                <p className="font-medium text-ink">{page.title}</p>
                <p className="text-xs text-ink/40 mt-1 line-clamp-2">{page.body.slice(0, 200)}</p>
                <p className="text-xs text-ink/30 mt-2">Updated {new Date(page.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setPageForm({ id: page.id, slug: page.slug, title: page.title, body: page.body }); setPageFormOpen(true); }}
                  className="px-3 py-1.5 border border-sage/20 text-ink/70 text-xs rounded-lg hover:bg-sage-light/40 transition-colors">
                  Edit
                </button>
                <button onClick={() => deletePage(page.id)} disabled={deleteLoading === page.id}
                  className="px-3 py-1.5 border border-rose-200 text-rose-600 text-xs rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50">
                  {deleteLoading === page.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FAQs ── */}
      {tab === "faqs" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setFaqForm({ question: "", answer: "", order: faqs.length }); setFaqFormOpen(true); }}
              className="bg-sage text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-sage-dark transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New FAQ
            </button>
          </div>

          {/* FAQ Form Modal */}
          {faqFormOpen && (
            <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up">
                <h3 className="font-display text-lg text-ink mb-4">{faqForm.id ? "Edit FAQ" : "New FAQ"}</h3>
                <div className="space-y-3">
                  <textarea value={faqForm.question} onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))}
                    placeholder="Question"
                    rows={2}
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-sage/20" />
                  <textarea value={faqForm.answer} onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))}
                    placeholder="Answer"
                    rows={4}
                    className="w-full border border-sage/20 rounded-xl px-3 py-2.5 text-sm text-ink resize-y focus:outline-none focus:ring-2 focus:ring-sage/20" />
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-ink/50 font-mono">Display order</label>
                    <input type="number" value={faqForm.order} onChange={(e) => setFaqForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                      className="w-20 border border-sage/20 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/20" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setFaqFormOpen(false)}
                    className="flex-1 border border-sage/20 rounded-xl py-2 text-sm text-ink/60 hover:bg-sage-light/40 transition-colors">
                    Cancel
                  </button>
                  <button onClick={submitFaq} disabled={faqFormLoading || !faqForm.question || !faqForm.answer}
                    className="flex-1 bg-sage text-white rounded-xl py-2 text-sm font-medium hover:bg-sage-dark transition-colors disabled:opacity-60">
                    {faqFormLoading ? "Saving…" : faqForm.id ? "Update FAQ" : "Create FAQ"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-8 text-center text-sm text-ink/40">Loading…</div>}
          {!loading && faqs.length === 0 && (
            <div className="bg-white rounded-2xl border border-sage/10 shadow-soft p-12 text-center text-sm text-ink/40">
              No FAQs yet. Add your first FAQ above.
            </div>
          )}
          {!loading && faqs.map((faq, idx) => (
            <div key={faq.id} className="bg-white rounded-2xl border border-sage/10 shadow-soft p-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs bg-paper border border-sage/10 px-2 py-0.5 rounded text-ink/50">#{faq.order}</span>
                </div>
                <p className="font-medium text-ink">{faq.question}</p>
                <p className="text-sm text-ink/60 mt-1.5 line-clamp-3">{faq.answer}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer, order: faq.order }); setFaqFormOpen(true); }}
                  className="px-3 py-1.5 border border-sage/20 text-ink/70 text-xs rounded-lg hover:bg-sage-light/40 transition-colors">
                  Edit
                </button>
                <button onClick={() => deleteFaq(faq.id)} disabled={deleteLoading === faq.id}
                  className="px-3 py-1.5 border border-rose-200 text-rose-600 text-xs rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50">
                  {deleteLoading === faq.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
