"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserAuth } from "@/app/context/UserAuthContext";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/directory";
  const { login } = useUserAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");

    setLoading(true);
    const res = await login(email, password);

    if (!res.success) {
      setError(res.error || "Login failed");
      setLoading(false);
    } else {
      router.push(redirect);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16 animate-fade-in">
      <div className="bg-white border border-sage/15 rounded-3xl p-8 sm:p-10 shadow-soft-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-3 text-sage-dark">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink">
            Welcome back
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Log in to your profile to manage your counselling bookings.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sage text-white py-3.5 rounded-full font-medium hover:bg-sage-dark hover:scale-[1.01] active:scale-[0.98] transition-all duration-150 text-sm mt-4 disabled:opacity-50 flex items-center justify-center gap-2 shadow-soft"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Logging in…
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-ink/50 mt-6">
          Don't have a profile yet?{" "}
          <Link
            href={`/user/register?redirect=${encodeURIComponent(redirect)}`}
            className="text-sage-dark font-medium underline hover:text-sage"
          >
            Sign up / Create profile
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-6 py-16 text-center animate-pulse">
          Loading login form...
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
