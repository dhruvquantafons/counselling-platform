"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NotificationFeed from "@/app/components/NotificationFeed";

const nav = [
  { label: "Find A Counsellor", href: "/directory" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Counsellors", href: "/counsellor/login" },
];

function VisitorNotificationBell() {
  const searchParams = useSearchParams();
  const queryBookingId = searchParams.get("bookingId");
  const [visitorBookingId, setVisitorBookingId] = useState<string | null>(null);
  const [visitorEmail, setVisitorEmail] = useState<string | null>(null);

  useEffect(() => {
    function syncVisitorInfo() {
      if (typeof window !== "undefined") {
        const id = queryBookingId || localStorage.getItem("visitorBookingId");
        const email = localStorage.getItem("visitorEmail");
        if (queryBookingId && queryBookingId !== localStorage.getItem("visitorBookingId")) {
          localStorage.setItem("visitorBookingId", queryBookingId);
        }
        setVisitorBookingId(id);
        setVisitorEmail(email);
      }
    }

    syncVisitorInfo();
    window.addEventListener("storage", syncVisitorInfo);
    return () => window.removeEventListener("storage", syncVisitorInfo);
  }, [queryBookingId]);

  return (
    <NotificationFeed
      bookingId={visitorBookingId || undefined}
      visitorEmail={visitorEmail || undefined}
      role="visitor"
    />
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change (link click)
  function handleNavClick() {
    setMenuOpen(false);
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "bg-[#F8F7F2]/95 backdrop-blur-md border-sage/15 shadow-soft"
          : "bg-[#F8F7F2]/90 backdrop-blur-md border-sage/10"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white font-display text-sm font-semibold group-hover:bg-sage-dark group-hover:rotate-12 transition-all duration-200">
            W
          </div>
          <span className="font-display text-lg text-ink tracking-tight">
            Why<span className="text-sage">beigh</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link-underline text-sm text-ink/60 hover:text-ink transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Suspense fallback={<NotificationFeed role="visitor" />}>
            <VisitorNotificationBell />
          </Suspense>
          <Link
            href="/directory"
            className="text-sm font-medium text-sage-dark hover:text-sage transition-colors duration-150"
          >
            Sign in
          </Link>
          <Link
            href="/directory"
            className="text-sm font-medium bg-sage text-white px-5 py-2 rounded-full hover:bg-sage-dark hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
          >
            Get started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2 text-ink/70 hover:text-ink transition-colors"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-sage/10 bg-[#F8F7F2] animate-slide-down">
          <div className="max-w-6xl mx-auto px-6 py-4 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="block py-3 text-ink/70 hover:text-ink text-sm transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-sage/10 flex flex-col gap-2">
              <Link
                href="/directory"
                onClick={handleNavClick}
                className="text-sm font-medium text-sage-dark py-2"
              >
                Sign in
              </Link>
              <Link
                href="/directory"
                onClick={handleNavClick}
                className="text-sm font-medium bg-sage text-white px-5 py-2.5 rounded-full text-center hover:bg-sage-dark active:scale-[0.98] transition-all duration-150"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
