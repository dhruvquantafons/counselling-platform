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

import { useUserAuth } from "@/app/context/UserAuthContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { user, logout } = useUserAuth();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change (link click)
  function handleNavClick() {
    setMenuOpen(false);
  }

  const userInitials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "U";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 bg-sage-dark border-white/10 ${
          scrolled ? "shadow-md backdrop-blur-md bg-sage-dark/95" : "backdrop-blur-sm"
        }`}
    >
      {/* Scroll Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden z-50">
        <div
          className="h-full bg-gradient-to-r from-sage-light via-amber-light to-amber transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sage-dark font-display text-sm font-semibold group-hover:bg-sage-light group-hover:rotate-12 transition-all duration-200">
            W
          </div>
          <span className="font-display text-lg text-white tracking-tight">
            Why<span className="text-sage-light">beigh</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link-underline text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Suspense fallback={<NotificationFeed role="visitor" />}>
            <VisitorNotificationBell />
          </Suspense>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/user/profile"
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 transition-all shadow-xs hover:shadow-soft"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sage-light to-white text-sage-dark flex items-center justify-center text-[10px] font-bold shadow-xs">
                  {userInitials}
                </div>
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              <button
                onClick={logout}
                className="group inline-flex items-center gap-1.5 text-xs font-medium text-white/75 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-white/15 border border-transparent hover:border-white/10 transition-all"
                title="Sign out of your account"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/user/login"
                className="text-sm font-medium text-white/85 hover:text-white transition-colors duration-150"
              >
                Login
              </Link>
              <Link
                href="/user/register"
                className="text-sm font-medium bg-sage-light text-sage-dark px-5 py-2 rounded-full hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 shadow-soft"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2 text-white/80 hover:text-white transition-colors"
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
        <div className="md:hidden border-t border-white/10 bg-sage-dark animate-slide-down">
          <div className="max-w-6xl mx-auto px-6 py-4 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="block py-3 text-white/80 hover:text-white text-sm transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href="/user/profile"
                    onClick={handleNavClick}
                    className="text-sm font-medium text-white py-2 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-white text-sage-dark flex items-center justify-center text-[10px] font-bold">
                      {userInitials}
                    </div>
                    <span>My Profile ({user.name})</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      handleNavClick();
                    }}
                    className="w-full inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:bg-white/15 text-left py-2.5 px-3 rounded-xl border border-transparent hover:border-white/10 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
                    </svg>
                    <span className="font-medium">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/user/login"
                    onClick={handleNavClick}
                    className="text-sm font-medium text-white/85 hover:text-white py-2"
                  >
                    Login
                  </Link>
                  <Link
                    href="/user/register"
                    onClick={handleNavClick}
                    className="text-sm font-medium bg-sage-light text-sage-dark px-5 py-2.5 rounded-full text-center hover:bg-white active:scale-[0.98] transition-all duration-150"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
