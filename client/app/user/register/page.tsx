"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserAuth } from "@/app/context/UserAuthContext";

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/directory";
  const { register } = useUserAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Full name is required.");
    if (!email.trim()) return setError("Email address is required.");
    if (!phone.trim()) return setError("Mobile number is required.");
    if (!password || password.length < 6)
      return setError("Password must be at least 6 characters long.");

    setLoading(true);
    const res = await register({
      name,
      email,
      phone,
      password,
      gender: gender || undefined,
      age: age ? parseInt(age, 10) : undefined,
      bio: bio || undefined,
    });

    if (!res.success) {
      setError(res.error || "Failed to create profile");
      setLoading(false);
    } else {
      router.push(redirect);
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-12 animate-fade-in">
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
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-ink">
            Create your profile
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Sign up to create your user profile and book sessions with verified counsellors.
          </p>
          {redirect.includes("checkout") && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl text-left">
              <strong>Notice:</strong> Profile creation is required before booking a counselling session.
            </div>
          )}
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
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Mobile Phone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Gender (Optional)
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Age (Optional)
              </label>
              <input
                type="number"
                min="14"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
              Profile Bio / Notes for Counsellor (Optional)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share anything you'd like your counsellor to know beforehand..."
              className="w-full border border-sage/20 rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none text-sm"
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
                Creating profile…
              </>
            ) : (
              "Complete Profile & Continue"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-ink/50 mt-6">
          Already have an account?{" "}
          <Link
            href={`/user/login?redirect=${encodeURIComponent(redirect)}`}
            className="text-sage-dark font-medium underline hover:text-sage"
          >
            Log in here
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto px-6 py-16 text-center animate-pulse">
          Loading sign in form...
        </div>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}
