import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type StaticPage = {
  id: string;
  slug: string;
  title: string;
  body: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

async function getPage(slug: string): Promise<StaticPage | null> {
  try {
    const res = await fetch(`${API_BASE}/api/static-pages/${slug}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Page Not Found" };
  return {
    title: `${page.title} — Whybeigh`,
    robots: { index: true, follow: true },
  };
}

export default async function StaticPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  // Render body: split on double newlines for paragraphs,
  // detect "N. Heading" lines for <h2>, preserve single newlines within blocks.
  const blocks = page.body.split(/\n{2,}/);

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 md:py-24 animate-page-enter">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-sage-dark transition-colors mb-10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>

      {/* Title */}
      <h1 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
        {page.title}
      </h1>
      <p className="text-xs text-ink/35 font-mono mb-10">
        Last updated:{" "}
        {new Date(page.updatedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="border-t border-sage/10 pt-10 space-y-5 text-ink/80 leading-relaxed">
        {blocks.map((block, i) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // Section heading: starts with a digit and a dot, e.g. "1. About this Policy"
          const headingMatch = trimmed.match(/^(\d+)\.\s+(.+)$/m);
          if (headingMatch && trimmed.split("\n").length === 1) {
            return (
              <h2
                key={i}
                className="font-display text-xl font-bold text-ink pt-4"
              >
                {headingMatch[1]}. {headingMatch[2]}
              </h2>
            );
          }

          // Address/contact block: render as a bordered callout
          if (trimmed.startsWith("Why Beigh\n") || trimmed.startsWith("Privacy and general")) {
            return (
              <div
                key={i}
                className="border border-sage/15 rounded-xl px-5 py-4 bg-sage-light/20 text-sm font-mono text-ink/70 whitespace-pre-line"
              >
                {trimmed}
              </div>
            );
          }

          // Regular paragraph
          return (
            <p key={i} className="text-sm leading-relaxed whitespace-pre-line">
              {trimmed}
            </p>
          );
        })}
      </div>
    </main>
  );
}
