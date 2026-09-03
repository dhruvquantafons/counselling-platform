"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!loading && !user) {
      router.push("/user/login");
    } else if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setGender(user.gender || "");
      setAge(user.age ? String(user.age) : "");
      setBio(user.bio || "");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    setLoadingBookings(true);
    fetch(`${API_BASE}/api/user/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBookings(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
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

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 animate-fade-in">
      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Sidebar Profile Card */}
        <aside className="bg-white border border-sage/15 rounded-3xl p-6 shadow-soft-md h-fit">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-sage flex items-center justify-center text-white font-display text-2xl font-bold mx-auto mb-3 shadow-soft ring-4 ring-sage-light">
              {initials}
            </div>
            <h1 className="font-display text-xl text-ink font-semibold">{user?.name}</h1>
            <p className="text-xs text-ink/60 mt-0.5">{user?.email}</p>
            <p className="text-xs text-ink/50 mt-0.5">{user?.phone}</p>
          </div>

          <div className="border-t border-sage/10 pt-4 space-y-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium bg-sage-light/60 hover:bg-sage-light text-sage-dark transition-colors flex items-center justify-between"
            >
              <span>{isEditing ? "Cancel Editing" : "Edit Profile"}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>

            <Link
              href="/directory"
              className="block text-left px-4 py-2.5 rounded-xl text-xs font-medium text-ink/70 hover:bg-sage-light/30 transition-colors"
            >
              Book New Session
            </Link>

            <button
              onClick={logout}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Log Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="space-y-8">
          {message && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl">
              {error}
            </div>
          )}

          {/* Edit Profile Form */}
          {isEditing ? (
            <section className="bg-white border border-sage/15 rounded-3xl p-6 sm:p-8 shadow-soft-md">
              <h2 className="font-display text-xl text-ink mb-6">Edit Profile Information</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm"
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
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                    Bio / Counselling Notes
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full border border-sage/20 rounded-xl px-4 py-2.5 bg-white text-ink text-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-sage text-white px-6 py-2.5 rounded-full text-xs font-medium hover:bg-sage-dark transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
          ) : (
            <section className="bg-white border border-sage/15 rounded-3xl p-6 sm:p-8 shadow-soft-md">
              <h2 className="font-display text-xl text-ink mb-4">Profile Details</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-sage-light/30 rounded-2xl p-4">
                  <p className="text-xs font-mono text-ink/50 uppercase tracking-wide mb-1">Full Name</p>
                  <p className="font-medium text-ink">{user?.name}</p>
                </div>
                <div className="bg-sage-light/30 rounded-2xl p-4">
                  <p className="text-xs font-mono text-ink/50 uppercase tracking-wide mb-1">Email</p>
                  <p className="font-medium text-ink">{user?.email}</p>
                </div>
                <div className="bg-sage-light/30 rounded-2xl p-4">
                  <p className="text-xs font-mono text-ink/50 uppercase tracking-wide mb-1">Phone</p>
                  <p className="font-medium text-ink">{user?.phone}</p>
                </div>
                <div className="bg-sage-light/30 rounded-2xl p-4">
                  <p className="text-xs font-mono text-ink/50 uppercase tracking-wide mb-1">Gender / Age</p>
                  <p className="font-medium text-ink">
                    {user?.gender || "Not specified"}{user?.age ? `, ${user.age} yrs` : ""}
                  </p>
                </div>
              </div>
              {user?.bio && (
                <div className="mt-4 bg-sage-light/30 rounded-2xl p-4">
                  <p className="text-xs font-mono text-ink/50 uppercase tracking-wide mb-1">Bio / Notes</p>
                  <p className="text-sm text-ink/80">{user.bio}</p>
                </div>
              )}
            </section>
          )}

          {/* Bookings Section */}
          <section className="bg-white border border-sage/15 rounded-3xl p-6 sm:p-8 shadow-soft-md">
            <h2 className="font-display text-xl text-ink mb-4">My Booked Sessions</h2>
            {loadingBookings ? (
              <p className="text-xs text-ink/50">Loading sessions...</p>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 bg-sage-light/20 rounded-2xl border border-dashed border-sage/20">
                <p className="text-sm text-ink/60 mb-3">You haven't booked any counselling sessions yet.</p>
                <Link
                  href="/directory"
                  className="inline-block bg-sage text-white px-5 py-2 rounded-full text-xs font-medium hover:bg-sage-dark transition-all"
                >
                  Browse Counsellors & Book
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="border border-sage/15 rounded-2xl p-5 hover:border-sage/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {b.status}
                        </span>
                        <span className="text-xs font-mono text-ink/40">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-medium text-ink text-sm">
                        {b.counsellor ? `Session with ${b.counsellor.name}` : "Counselling Session"}
                      </p>
                      {b.counsellor?.specialisation && (
                        <p className="text-xs text-ink/60">{b.counsellor.specialisation}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/session?bookingId=${b.id}`}
                        className="bg-sage-light text-sage-dark hover:bg-sage hover:text-white px-4 py-2 rounded-full text-xs font-medium transition-all"
                      >
                        Session Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
