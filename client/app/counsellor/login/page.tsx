"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:4000";

export default function CounsellorLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [email, setEmail] = useState("anjali.mehta@example.com");
  const [password, setPassword] = useState("password123");
  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Submit email & password
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/counsellor/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      setTempToken(data.tempToken);
      setStep("2fa");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Submit 2FA 6-digit code
  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit 2FA code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/counsellor/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "2FA verification failed");

      localStorage.setItem("counsellorToken", data.token);
      localStorage.setItem("counsellorData", JSON.stringify(data.counsellor));
      router.push("/counsellor/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "2FA verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-20 animate-fade-in">
      <div className="bg-white rounded-3xl border border-sage/15 p-8 shadow-soft-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4 ring-4 ring-sage/10">
            <svg className="w-6 h-6 text-sage-dark" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="font-mono text-xs text-sage uppercase tracking-wider mb-1">
            Counsellor Portal
          </p>
          <h1 className="font-display text-2xl text-ink">
            {step === "credentials" ? "Sign in to your account" : "Two-factor authentication"}
          </h1>
          <p className="text-xs text-ink/50 mt-1.5">
            {step === "credentials"
              ? "Access your appointments, client notes, and availability"
              : "Enter the 6-digit security code generated for your account"}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3.5 text-xs flex items-center gap-2 animate-fade-in-up">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Step 1 Form */}
        {step === "credentials" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-ink/60 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-paper/50 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                placeholder="counsellor@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-ink/60 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-paper/50 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sage text-white py-3.5 rounded-full text-sm font-medium hover:bg-sage-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 bg-sage-light/40 rounded-xl p-3 text-[11px] text-ink/60 text-center border border-sage/10">
              Demo account loaded: <span className="font-mono text-ink">anjali.mehta@example.com</span>
            </div>
          </form>
        ) : (
          /* Step 2 Form (2FA) */
          <form onSubmit={handleVerify2FA} className="space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase text-ink/60 mb-2 text-center">
                Enter 6-Digit 2FA Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                className="w-full tracking-[0.5em] text-center font-mono text-xl border border-sage/30 rounded-xl px-4 py-3 bg-paper/50 text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                placeholder="123456"
              />
            </div>

            <div className="bg-sage-light/50 rounded-xl p-3 text-center border border-sage/15">
              <p className="text-xs text-ink/70">
                <span className="font-semibold text-sage-dark">2FA Demo Hint:</span> Enter <span className="font-mono bg-white px-2 py-0.5 rounded border text-ink">123456</span> to complete authentication.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-sage text-white py-3.5 rounded-full text-sm font-medium hover:bg-sage-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? "Verifying..." : "Verify & Enter Admin"}
              </button>

              <button
                type="button"
                onClick={() => setStep("credentials")}
                className="w-full text-xs text-ink/50 hover:text-ink transition-colors py-2 text-center"
              >
                ← Back to email sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
