"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUserAuth } from "@/app/context/UserAuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type BookingRecord = {
  id: string;
  counsellorId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  startTime: string;
  status: string;
  roomId?: string;
  createdAt: string;
  counsellor?: {
    id: string;
    name: string;
    specialisation: string;
    photoUrl?: string;
  };
  payment?: {
    amount: number;
    status: string;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loading, updateProfile, logout } = useUserAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState<"ALL" | "CONFIRMED" | "PENDING" | "COMPLETED">("ALL");

  useEffect(() => {
    const mounted = { current: true };
    if (!loading && !user) {
      router.push("/user/login");
    } else if (user && mounted.current) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setGender(user.gender || "");
      setAge(user.age ? String(user.age) : "");
      setBio(user.bio || "");
    }
    return () => {
      mounted.current = false;
    };
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    const mounted = { current: true };
    const controller = new AbortController();
    setLoadingBookings(true);
    fetch(`${API_BASE}/api/user/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (mounted.current && Array.isArray(data)) {
          setBookings(data);
        }
      })
      .catch((err) => {
        if ((err as any).name === "AbortError") return;
      })
      .finally(() => {
        if (mounted.current) setLoadingBookings(false);
      });
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const res = await updateProfile({
      name,
      phone,
      gender: gender || undefined,
      age: age ? parseInt(age, 10) : undefined,
      bio: bio || undefined,
    });

    setSaving(false);
    if (res.success) {
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } else {
      setError(res.error || "Failed to update profile");
    }
  }

  if (loading || (!user && !loading)) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-16 text-center animate-pulse">
        Loading profile...
      </main>
    );
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === "ALL") return true;
    if (bookingFilter === "CONFIRMED") return b.status === "CONFIRMED";
    if (bookingFilter === "PENDING") return b.status === "PENDING";
    if (bookingFilter === "COMPLETED") return b.status === "COMPLETED" || b.status === "CANCELLED";
    return true;
  });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-fade-in space-y-6">
      {/* Top Welcome Header Banner */}
      <div className="bg-gradient-to-r from-sage-dark via-sage to-sage-dark text-white rounded-2xl sm:rounded-3xl px-5 py-4 sm:px-6 sm:py-5 shadow-soft-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-medium text-sage-light">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Member
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome back, {user?.name?.split(" ")[0] || "User"} 👋
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-start md:self-auto flex-wrap">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 text-center min-w-[88px]">
              <p className="text-[9px] font-mono uppercase tracking-wider text-white/70">Sessions</p>
              <p className="font-display text-lg font-bold text-white leading-tight">{bookings.length}</p>
            </div>

            <Link
              href="/directory"
              className="inline-flex items-center gap-1.5 bg-white text-sage-dark font-medium px-3.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs hover:bg-sage-light transition-all shadow-soft group"
            >
              <span>Book Session</span>
              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">
        {/* Sidebar Profile Card */}
        <aside className="bg-white border border-sage/15 rounded-3xl p-6 shadow-soft-md sticky top-6 space-y-6">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sage to-sage-dark flex items-center justify-center text-white font-display text-2xl font-bold shadow-soft ring-4 ring-sage-light/80">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 bg-emerald-500 border-2 border-white w-4 h-4 rounded-full" title="Active" />
            </div>
            <h2 className="font-display text-lg text-ink font-semibold">{user?.name}</h2>
            <p className="text-xs text-ink/60 mt-0.5 break-all">{user?.email}</p>
            <span className="inline-block mt-2 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sage-light/60 text-sage-dark font-medium">
              Verified Client
            </span>
          </div>

          <div className="border-t border-sage/10 pt-4 space-y-2">
            <button
              onClick={() => setIsEditing(true)}
              className={`w-full text-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                isEditing
                  ? "bg-sage-dark text-white shadow-soft ring-2 ring-sage/30"
                  : "bg-sage hover:bg-sage-dark text-white shadow-soft"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              <span>{isEditing ? "Currently Editing" : "Edit Profile"}</span>
            </button>

            <Link
              href="/directory"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium text-ink/70 hover:bg-sage-light/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-ink/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>Find Counsellor</span>
              </span>
              <svg className="w-3.5 h-3.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="space-y-6">
          {message && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center gap-2 shadow-xs">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-center gap-2 shadow-xs">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {isEditing && (
            <section className="bg-white border border-sage/15 rounded-3xl p-6 sm:p-8 shadow-soft-md">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-sage/10">
                <div>
                  <h2 className="font-display text-xl text-ink font-semibold">Edit Profile Information</h2>
                  <p className="text-xs text-ink/60 mt-0.5">Update your personal information used for session bookings</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-ink/50 hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-sage-light/30"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-all"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-all"
                    >
                      <option value="">Select gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 26"
                      className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1.5">
                    Bio / Counselling Notes
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Share any background or topics you'd like to focus on during counselling..."
                    className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm resize-none focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-sage text-white px-6 py-2.5 rounded-full text-xs font-medium hover:bg-sage-dark transition-all disabled:opacity-50 shadow-soft"
                  >
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-full text-xs text-ink/60 hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Bookings Section */}
          <section className="bg-white border border-sage/15 rounded-3xl p-6 sm:p-8 shadow-soft-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-sage/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl text-ink font-semibold">My Booked Sessions</h2>
                  <span className="bg-sage-light text-sage-dark text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full">
                    {bookings.length}
                  </span>
                </div>
                <p className="text-xs text-ink/60 mt-0.5">Manage and view your upcoming and past appointments</p>
              </div>

              {/* Status Filter Tabs */}
              {bookings.length > 0 && (
                <div className="flex items-center gap-1 bg-sage-light/40 p-1 rounded-2xl self-start sm:self-auto overflow-x-auto max-w-full">
                  {(["ALL", "CONFIRMED", "PENDING", "COMPLETED"] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setBookingFilter(filterKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                        bookingFilter === filterKey
                          ? "bg-white text-sage-dark shadow-xs font-semibold"
                          : "text-ink/60 hover:text-ink hover:bg-white/50"
                      }`}
                    >
                      {filterKey === "ALL" ? "All" : filterKey === "CONFIRMED" ? "Confirmed" : filterKey === "PENDING" ? "Pending" : "History"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loadingBookings ? (
              <div className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-sage-light/30 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-10 bg-sage-light/20 rounded-2xl border border-dashed border-sage/20">
                <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-3 text-sage-dark">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-ink mb-1">No Bookings Found</p>
                <p className="text-xs text-ink/60 mb-4 max-w-sm mx-auto">
                  You haven't booked any counselling sessions yet. Take the first step towards your wellbeing.
                </p>
                <Link
                  href="/directory"
                  className="inline-flex items-center gap-2 bg-sage text-white px-5 py-2.5 rounded-full text-xs font-medium hover:bg-sage-dark transition-all shadow-soft"
                >
                  <span>Browse Counsellors & Book</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8 bg-sage-light/20 rounded-2xl">
                <p className="text-xs text-ink/60">
                  No{" "}
                  {bookingFilter === "COMPLETED"
                    ? "history"
                    : bookingFilter.toLowerCase()}{" "}
                  sessions found.
                </p>
              </div>
            ) : (
              /* Fixed height container with vertical scrolling so many bookings don't stretch the page */
              <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
                {filteredBookings.map((b) => {
                  const formattedDate = b.startTime
                    ? new Date(b.startTime).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : new Date(b.createdAt).toLocaleDateString();

                  const formattedTime = b.startTime
                    ? new Date(b.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null;

                  return (
                    <div
                      key={b.id}
                      className="border border-sage/15 hover:border-sage/30 bg-white rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:shadow-soft"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-sage-light flex-shrink-0 flex items-center justify-center text-sage-dark font-semibold text-sm">
                          {b.counsellor?.name ? b.counsellor.name[0] : "C"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-semibold ${
                                b.status === "CONFIRMED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : b.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-gray-100 text-gray-700 border border-gray-200"
                              }`}
                            >
                              {b.status}
                            </span>
                            <span className="text-xs font-mono text-ink/50 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                              </svg>
                              {formattedDate} {formattedTime ? `at ${formattedTime}` : ""}
                            </span>
                          </div>

                          <h3 className="font-display font-medium text-ink text-sm">
                            {b.counsellor ? `Session with ${b.counsellor.name}` : "Counselling Session"}
                          </h3>
                          {b.counsellor?.specialisation && (
                            <p className="text-xs text-ink/60 mt-0.5">{b.counsellor.specialisation}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-sage/10">
                        {b.payment?.amount && (
                          <span className="text-xs font-mono font-medium text-ink/70">
                            ₹{b.payment.amount}
                          </span>
                        )}
                        <Link
                          href={`/session?bookingId=${b.id}`}
                          className="inline-flex items-center gap-1.5 bg-sage-light text-sage-dark hover:bg-sage hover:text-white px-4 py-2 rounded-full text-xs font-medium transition-all"
                        >
                          <span>Session Details</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
