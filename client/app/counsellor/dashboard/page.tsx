"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type CounsellorProfile = {
  id: string;
  name: string;
  email: string;
  specialisation: string;
  languages: string[];
  fee: number;
  bio: string | null;
  approved: boolean;
  pendingApproval: boolean;
  pendingChanges: {
    bio?: string;
    fee?: number;
    specialisation?: string;
    languages?: string[];
    photoUrl?: string;
    updatedAt: string;
  } | null;
};

type AvailabilitySlot = {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
};

type SessionItem = {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  startTime: string;
  status: string;
  fee: number;
  hasNote: boolean;
  roomUrl: string;
};

type EarningsData = {
  totalEarnings: number;
  mtdEarnings: number;
  completedCount: number;
  upcomingCount: number;
  avgPerSession: number;
  breakdown: Array<{
    id: string;
    visitorName: string;
    visitorEmail?: string;
    visitorPhone?: string;
    date: string;
    time?: string;
    amount: number;
    status: string;
    paymentMode?: string;
    paymentId?: string;
    startTime?: string;
    createdAt?: string;
    receiptUrl?: string;
  }>;
};

/* ─── Reusable Pagination Control ────────────────────────────────────────── */
function PaginationControl({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-4 border-t border-sage/10 text-xs text-ink/60">
      <div>
        Showing <span className="font-semibold text-ink">{startItem}</span>–
        <span className="font-semibold text-ink">{endItem}</span> of{" "}
        <span className="font-semibold text-ink">{totalItems}</span> results
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 font-mono">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-sage/20 bg-white text-ink hover:bg-sage-light/40 disabled:opacity-40 disabled:hover:bg-white transition-colors"
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg border transition-colors ${currentPage === p
                  ? "bg-sage text-white border-sage font-bold"
                  : "bg-white text-ink/70 border-sage/20 hover:bg-sage-light/40"
                }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-sage/20 bg-white text-ink hover:bg-sage-light/40 disabled:opacity-40 disabled:hover:bg-white transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default function CounsellorDashboard() {
  const router = useRouter();
  const [counsellor, setCounsellor] = useState<CounsellorProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "availability" | "sessions" | "notes" | "profile">("overview");
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Earnings & Receipt Modal state
  const [selectedRecord, setSelectedRecord] = useState<EarningsData["breakdown"][number] | null>(null);

  // Availability state
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("10:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:50");

  // Recurring availability state
  const [recStart, setRecStart] = useState("");
  const [recEnd, setRecEnd] = useState("");
  const [recDays, setRecDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Block date state
  const [blockDate, setBlockDate] = useState("");

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionFilter, setSessionFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  // Private Note state
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSavedAt, setNoteSavedAt] = useState<string | null>(null);

  // Profile Edit state
  const [editBio, setEditBio] = useState("");
  const [editFee, setEditFee] = useState<number>(1200);
  const [editSpec, setEditSpec] = useState("");
  const [editLang, setEditLang] = useState("");
  const [editPhoto, setEditPhoto] = useState("");

  // Earnings state
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  // ── Search & Pagination States ───────────────────────────────────────────
  // 1. Overview & Earnings
  const [earningsSearch, setEarningsSearch] = useState("");
  const [earningsPage, setEarningsPage] = useState(1);
  const EARNINGS_PER_PAGE = 5;

  // 2. Availability & Schedule
  const [availabilitySearch, setAvailabilitySearch] = useState("");
  const [availabilityPage, setAvailabilityPage] = useState(1);
  const AVAILABILITY_PER_PAGE = 9;

  // 3. Sessions & Calendar
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const SESSIONS_PER_PAGE = 6;

  // ── Authentication Check ─────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("counsellorToken");
    if (!token) {
      router.replace("/counsellor/login");
      return;
    }

    fetch(`${API_BASE}/api/counsellor/me?counsellorId=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to authenticate session");
        return res.json();
      })
      .then((data) => {
        setCounsellor(data);
        setEditBio(data.bio || "");
        setEditFee(data.fee || 1200);
        setEditSpec(data.specialisation || "");
        setEditLang(data.languages ? data.languages.join(", ") : "");
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("counsellorToken");
        router.replace("/counsellor/login");
      });
  }, [router]);

  // ── Fetchers ─────────────────────────────────────────────────────────────
  const fetchAvailability = useCallback(() => {
    if (!counsellor) return;
    fetch(`${API_BASE}/api/counsellor/availability?counsellorId=${counsellor.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSlots(data);
      })
      .catch(() => { });
  }, [counsellor]);

  const fetchSessions = useCallback(() => {
    if (!counsellor) return;
    fetch(`${API_BASE}/api/counsellor/sessions?counsellorId=${counsellor.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(() => { });
  }, [counsellor]);

  const fetchEarnings = useCallback(() => {
    if (!counsellor) return;
    fetch(`${API_BASE}/api/counsellor/earnings?counsellorId=${counsellor.id}`)
      .then((r) => r.json())
      .then((data) => setEarnings(data))
      .catch(() => { });
  }, [counsellor]);

  useEffect(() => {
    if (!counsellor) return;
    fetchAvailability();
    fetchSessions();
    fetchEarnings();
  }, [counsellor, fetchAvailability, fetchSessions, fetchEarnings]);

  // ── Availability Actions ──────────────────────────────────────────────────
  async function handleAddSingleSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!counsellor || !newSlotDate) return;

    const startISO = new Date(`${newSlotDate}T${newSlotStart}:00`).toISOString();
    const endISO = new Date(`${newSlotDate}T${newSlotEnd}:00`).toISOString();

    try {
      const res = await fetch(`${API_BASE}/api/counsellor/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counsellorId: counsellor.id, startTime: startISO, endTime: endISO }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add slot");

      setActionMessage({ text: "Availability slot published!", type: "success" });
      fetchAvailability();
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Error creating slot", type: "error" });
    }
  }

  async function handleWithdrawSlot(id: string) {
    try {
      const res = await fetch(`${API_BASE}/api/counsellor/availability/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to withdraw slot");

      setActionMessage({ text: "Slot withdrawn successfully.", type: "success" });
      fetchAvailability();
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Error withdrawing slot", type: "error" });
    }
  }

  async function handleRecurringPattern(e: React.FormEvent) {
    e.preventDefault();
    if (!counsellor || !recStart || !recEnd) return;

    try {
      const res = await fetch(`${API_BASE}/api/counsellor/availability/recurring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counsellorId: counsellor.id,
          startDate: recStart,
          endDate: recEnd,
          daysOfWeek: recDays,
          timeSlots: [
            { start: "09:00", end: "09:50" },
            { start: "10:00", end: "10:50" },
            { start: "11:00", end: "11:50" },
            { start: "14:00", end: "14:50" },
            { start: "15:30", end: "16:20" },
            { start: "17:00", end: "17:50" },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply recurring pattern");

      setActionMessage({ text: `Created ${data.createdCount} slots based on weekly pattern!`, type: "success" });
      fetchAvailability();
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Error applying pattern", type: "error" });
    }
  }

  async function handleBlockDate(e: React.FormEvent) {
    e.preventDefault();
    if (!counsellor || !blockDate) return;

    try {
      const res = await fetch(`${API_BASE}/api/counsellor/availability/block-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counsellorId: counsellor.id, date: blockDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to block date");

      setActionMessage({ text: `Blocked date ${blockDate}. Removed ${data.removedSlots} unbooked slots.`, type: "success" });
      fetchAvailability();
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Error blocking date", type: "error" });
    }
  }

  // ── Notes Actions ─────────────────────────────────────────────────────────
  function handleSelectSessionForNotes(bId: string) {
    setSelectedBookingId(bId);
    setNoteLoading(true);
    fetch(`${API_BASE}/api/counsellor/sessions/${bId}/notes`)
      .then((r) => r.json())
      .then((data) => {
        setCurrentNote(data.note || "");
        setNoteSavedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : null);
      })
      .finally(() => setNoteLoading(false));
  }

  async function handleSaveNote() {
    if (!selectedBookingId) return;
    setNoteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/counsellor/sessions/${selectedBookingId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: currentNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to save note");

      setNoteSavedAt(new Date(data.updatedAt).toLocaleTimeString());
      setActionMessage({ text: "Private session note saved securely.", type: "success" });
      fetchSessions();
    } catch {
      setActionMessage({ text: "Error saving session note.", type: "error" });
    } finally {
      setNoteLoading(false);
    }
  }

  // ── Profile Edit Action ───────────────────────────────────────────────────
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!counsellor) return;

    try {
      const res = await fetch(`${API_BASE}/api/counsellor/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counsellorId: counsellor.id,
          bio: editBio,
          fee: Number(editFee),
          specialisation: editSpec,
          languages: editLang.split(",").map((s) => s.trim()).filter(Boolean),
          photoUrl: editPhoto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setCounsellor((prev) =>
        prev
          ? {
            ...prev,
            pendingApproval: true,
            pendingChanges: data.pendingChanges,
          }
          : null
      );
      setActionMessage({
        text: "Profile changes submitted! Awaiting platform administrator approval.",
        type: "success",
      });
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Error updating profile", type: "error" });
    }
  }

  function handleLogout() {
    localStorage.removeItem("counsellorToken");
    localStorage.removeItem("counsellorData");
    router.push("/counsellor/login");
  }

  if (loading || !counsellor) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-sage-light/60 rounded w-1/3" />
          <div className="h-12 bg-sage-light/60 rounded" />
          <div className="h-64 bg-sage-light/60 rounded-2xl" />
        </div>
      </main>
    );
  }

  // ── Filtered & Paginated Datasets ─────────────────────────────────────────

  // 1. Earnings Breakdown Filter & Pagination
  const rawBreakdown = earnings?.breakdown || [];
  const filteredBreakdown = rawBreakdown.filter((item) => {
    const q = earningsSearch.toLowerCase();
    return (
      item.visitorName.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q)
    );
  });
  const earningsTotalPages = Math.ceil(filteredBreakdown.length / EARNINGS_PER_PAGE) || 1;
  const paginatedBreakdown = filteredBreakdown.slice(
    (earningsPage - 1) * EARNINGS_PER_PAGE,
    earningsPage * EARNINGS_PER_PAGE
  );

  // 2. Availability Slots Filter & Pagination
  const filteredSlots = slots.filter((slot) => {
    const dt = new Date(slot.startTime);
    const dateStr = dt.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timeStr = dt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const statusStr = slot.isBooked ? "booked" : "open";
    const q = availabilitySearch.toLowerCase();

    return (
      dateStr.toLowerCase().includes(q) ||
      timeStr.toLowerCase().includes(q) ||
      statusStr.includes(q)
    );
  });
  const availabilityTotalPages = Math.ceil(filteredSlots.length / AVAILABILITY_PER_PAGE) || 1;
  const paginatedSlots = filteredSlots.slice(
    (availabilityPage - 1) * AVAILABILITY_PER_PAGE,
    availabilityPage * AVAILABILITY_PER_PAGE
  );

  // 3. Sessions Filter & Pagination
  const filteredSessions = sessions.filter((s) => {
    const matchesTabFilter =
      sessionFilter === "all"
        ? true
        : sessionFilter === "upcoming"
          ? new Date(s.startTime) >= new Date()
          : new Date(s.startTime) < new Date();

    const dt = new Date(s.startTime);
    const dateStr = dt.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const q = sessionSearch.toLowerCase();
    const matchesSearch =
      s.visitorName.toLowerCase().includes(q) ||
      s.visitorEmail.toLowerCase().includes(q) ||
      s.visitorPhone.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q) ||
      dateStr.toLowerCase().includes(q);

    return matchesTabFilter && matchesSearch;
  });
  const sessionsTotalPages = Math.ceil(filteredSessions.length / SESSIONS_PER_PAGE) || 1;
  const paginatedSessions = filteredSessions.slice(
    (sessionPage - 1) * SESSIONS_PER_PAGE,
    sessionPage * SESSIONS_PER_PAGE
  );

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-sage/15">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-3xl text-ink">{counsellor.name}</h1>
            <span className="bg-sage-light text-sage-dark text-xs font-mono px-3 py-1 rounded-full border border-sage/20">
              Approved Counsellor
            </span>
          </div>
          <p className="text-sm text-ink/60">
            {counsellor.specialisation} · {counsellor.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="text-xs font-mono text-ink/60 hover:text-ink border border-sage/20 rounded-full px-4 py-2 hover:bg-sage-light/50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`mb-6 rounded-2xl p-4 text-xs font-medium flex items-center justify-between animate-fade-in-up ${actionMessage.type === "success"
              ? "bg-sage-light/70 text-sage-dark border border-sage/20"
              : "bg-amber-light/70 text-amber border border-amber/30"
            }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 mb-8 border-b border-sage/10 pb-3">
        {[
          { id: "overview", label: "Overview & Earnings" },
          { id: "availability", label: "Availability & Schedule" },
          { id: "sessions", label: "Sessions & Calendar" },
          { id: "notes", label: "Private Session Notes" },
          { id: "profile", label: "Profile Management" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${activeTab === tab.id
                ? "bg-sage text-white shadow-soft"
                : "text-ink/75 hover:text-ink hover:bg-sage-light/60 bg-sage-light/10"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Overview & Earnings ────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fade-in">
          {/* Key Metric Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="card-hover bg-white rounded-2xl border border-sage/10 ring-1 ring-sage/20 p-5 shadow-soft relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-sage to-sage-dark" />
              <div className="flex items-start justify-between mb-3 pl-1">
                <p className="text-xs font-mono uppercase tracking-wider text-ink/55">Total Revenue</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-sage to-sage-dark text-white shadow-soft">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m7.5-4C19.5 15.538 16.056 18 12 18S4.5 15.538 4.5 14 7.944 10 12 10s7.5 1.538 7.5 4zM4.5 14a7.5 7.5 0 0015 0M12 3v.01" />
                  </svg>
                </div>
              </div>
              <p className="font-display text-2xl text-ink mb-1 pl-1 tabular-nums tracking-tight">
                ₹{earnings ? earnings.totalEarnings.toLocaleString("en-IN") : 0}
              </p>
              <div className="flex items-center justify-between pl-1">
                <p className="text-xs text-ink/45">Lifetime payments collected</p>
              </div>
            </div>

            <div className="card-hover bg-white rounded-2xl border border-sage/10 ring-1 ring-sky-200/80 p-5 shadow-soft relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-sky-500 to-indigo-600" />
              <div className="flex items-start justify-between mb-3 pl-1">
                <p className="text-xs font-mono uppercase tracking-wider text-ink/55">MTD Earnings</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-soft">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                  </svg>
                </div>
              </div>
              <p className="font-display text-2xl text-ink mb-1 pl-1 tabular-nums tracking-tight">
                ₹{earnings ? earnings.mtdEarnings.toLocaleString("en-IN") : 0}
              </p>
              <div className="flex items-center justify-between pl-1">
                <p className="text-xs text-ink/45">Month-to-date income</p>
              </div>
            </div>

            <div className="card-hover bg-white rounded-2xl border border-sage/10 ring-1 ring-emerald-100/80 p-5 shadow-soft relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              <div className="flex items-start justify-between mb-3 pl-1">
                <p className="text-xs font-mono uppercase tracking-wider text-ink/55">Completed Sessions</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-soft">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
              </div>
              <p className="font-display text-2xl text-ink mb-1 pl-1 tabular-nums tracking-tight">
                {earnings ? earnings.completedCount : 0}
              </p>
              <div className="flex items-center justify-between pl-1">
                <p className="text-xs text-ink/45">Avg ₹{earnings ? earnings.avgPerSession : 0}/session</p>
              </div>
            </div>

            <div className="card-hover bg-white rounded-2xl border border-sage/10 ring-1 ring-amber/20 p-5 shadow-soft relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-amber to-amber-600" />
              <div className="flex items-start justify-between mb-3 pl-1">
                <p className="text-xs font-mono uppercase tracking-wider text-ink/55">Upcoming Sessions</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber to-amber-600 text-white shadow-soft">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm-6 0h.008v.008H6V15Zm0-3h.008v.008H6v-.008Zm12 0h.008v.008H18v-.008Zm0 3h.008v.008H18V15Z" />
                  </svg>
                </div>
              </div>
              <p className="font-display text-2xl text-ink mb-1 pl-1 tabular-nums tracking-tight">
                {earnings ? earnings.upcomingCount : 0}
              </p>
              <div className="flex items-center justify-between pl-1">
                <p className="text-xs text-ink/45">Scheduled on calendar</p>
              </div>
            </div>
          </div>

          {/* Earnings Breakdown Table with Search & Pagination */}
          <div className="bg-white rounded-2xl border border-sage/15 p-6 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-sage/10">
              <div>
                <h2 className="font-display text-xl text-ink">Earnings & Payment Breakdown</h2>
                <p className="text-xs text-ink/50">List of confirmed client session fees collected</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={earningsSearch}
                  onChange={(e) => {
                    setEarningsSearch(e.target.value);
                    setEarningsPage(1);
                  }}
                  placeholder="Search client, date, status..."
                  className="w-full border border-sage/20 rounded-full pl-9 pr-8 py-2 text-xs bg-paper/40 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                />
                <svg className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
                </svg>
                {earningsSearch && (
                  <button
                    onClick={() => {
                      setEarningsSearch("");
                      setEarningsPage(1);
                    }}
                    className="absolute right-3 top-2 text-xs text-ink/40 hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {paginatedBreakdown.length > 0 ? (
              <div className="divide-y divide-sage/10">
                {paginatedBreakdown.map((item) => {
                  const mode = item.paymentMode || "Card";
                  const modeColor =
                    mode === "Card"
                      ? "bg-sage-light text-sage-dark border-sage/20"
                      : mode === "UPI"
                        ? "bg-paper text-sage border-sage/20"
                        : mode === "Wallet"
                          ? "bg-amber-light text-amber border-amber/30"
                          : "bg-ink/5 text-ink border-ink/10";

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRecord(item)}
                      className="py-3.5 px-3 rounded-xl flex items-center justify-between text-sm hover:bg-sage-light/30 cursor-pointer transition-all group"
                      title="Click to view full receipt & transaction details"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-sage-light/70 flex items-center justify-center text-xs font-bold text-sage-dark shrink-0">
                          {item.visitorName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink group-hover:text-sage-dark transition-colors">
                              {item.visitorName}
                            </p>
                            <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${modeColor}`}>
                              {mode === "UPI" ? "UPI" : mode === "Card" ? "Card" : mode === "Wallet" ? "Wallet" : "Netbanking"}
                            </span>
                          </div>
                          <p className="text-xs text-ink/50 mt-0.5">
                            {item.date} {item.time ? `· ${item.time}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-mono font-semibold text-sage-dark">₹{item.amount}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            item.status === "COMPLETED" || item.status === "SUCCESS" || item.status === "CONFIRMED" ? "bg-sage-50 text-sage-dark ring-1 ring-sage/20" :
                            item.status === "FAILED" || item.status === "CANCELLED" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" :
                            "bg-amber-50 text-amber ring-1 ring-amber/20"
                          }`}>
                            <span className={`w-1 h-1 rounded-full mr-1.5 ${
                              item.status === "COMPLETED" || item.status === "SUCCESS" || item.status === "CONFIRMED" ? "bg-sage" :
                              item.status === "FAILED" || item.status === "CANCELLED" ? "bg-rose-500" :
                              "bg-amber"
                            }`} />
                            {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <span className="text-xs text-sage opacity-0 group-hover:opacity-100 transition-opacity">
                          View Receipt →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink/40 py-8 text-center">
                {earningsSearch ? `No earnings found matching "${earningsSearch}".` : "No completed session payments recorded yet."}
              </p>
            )}

            {/* Pagination Controls */}
            <PaginationControl
              currentPage={earningsPage}
              totalPages={earningsTotalPages}
              totalItems={filteredBreakdown.length}
              pageSize={EARNINGS_PER_PAGE}
              onPageChange={(page) => setEarningsPage(page)}
            />
          </div>
        </div>
      )}

      {/* ── Tab 2: Availability & Schedule Management ───────────────────────── */}
      {activeTab === "availability" && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* 1. Add Single Slot Form */}
            <div className="bg-white rounded-2xl border border-sage/15 p-6 shadow-soft">
              <h2 className="font-display text-lg text-ink mb-1">Publish Single Slot</h2>
              <p className="text-xs text-ink/50 mb-5">Create a single available session hour</p>

              <form onSubmit={handleAddSingleSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-ink/60 mb-1">Date</label>
                  <input
                    type="date"
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    required
                    className="w-full border border-sage/20 rounded-xl px-3 py-2 text-sm bg-paper/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-ink/60 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newSlotStart}
                      onChange={(e) => setNewSlotStart(e.target.value)}
                      required
                      className="w-full border border-sage/20 rounded-xl px-3 py-2 text-sm bg-paper/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink/60 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newSlotEnd}
                      onChange={(e) => setNewSlotEnd(e.target.value)}
                      required
                      className="w-full border border-sage/20 rounded-xl px-3 py-2 text-sm bg-paper/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-sage text-white rounded-full py-2.5 text-xs font-mono font-medium hover:bg-sage-dark transition-colors"
                >
                  + Publish Slot
                </button>
              </form>
            </div>

            {/* 2. Recurring Weekly Pattern Tool */}
            <div className="bg-white rounded-2xl border border-sage/15 p-6 shadow-soft">
              <h2 className="font-display text-lg text-ink mb-1">Apply Weekly Pattern</h2>
              <p className="text-xs text-ink/50 mb-5">Generate standard slots across date range</p>

              <form onSubmit={handleRecurringPattern} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-ink/60 mb-1">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={recStart}
                      onChange={(e) => setRecStart(e.target.value)}
                      required
                      className="border border-sage/20 rounded-xl px-3 py-2 text-xs bg-paper/50"
                    />
                    <input
                      type="date"
                      value={recEnd}
                      onChange={(e) => setRecEnd(e.target.value)}
                      required
                      className="border border-sage/20 rounded-xl px-3 py-2 text-xs bg-paper/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-ink/60 mb-1.5">Weekdays</label>
                  <div className="flex gap-1.5">
                    {[
                      { day: 1, label: "M" },
                      { day: 2, label: "T" },
                      { day: 3, label: "W" },
                      { day: 4, label: "T" },
                      { day: 5, label: "F" },
                      { day: 6, label: "S" },
                      { day: 0, label: "S" },
                    ].map((item) => {
                      const selected = recDays.includes(item.day);
                      return (
                        <button
                          key={item.day + item.label}
                          type="button"
                          onClick={() =>
                            setRecDays((prev) =>
                              selected ? prev.filter((d) => d !== item.day) : [...prev, item.day]
                            )
                          }
                          className={`w-8 h-8 rounded-lg text-xs font-mono transition-colors ${selected
                              ? "bg-sage text-white font-bold"
                              : "bg-sage-light/50 text-ink/50 hover:bg-sage-light"
                            }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-sage-dark text-white rounded-full py-2.5 text-xs font-mono font-medium hover:bg-ink transition-colors"
                >
                  Apply Weekly Schedule
                </button>
              </form>
            </div>

            {/* 3. Block Leave Date Tool */}
            <div className="bg-white rounded-2xl border border-sage/15 p-6 shadow-soft">
              <h2 className="font-display text-lg text-ink mb-1">Block Dates (Leave)</h2>
              <p className="text-xs text-ink/50 mb-5">Withdraw all open hours for selected day</p>

              <form onSubmit={handleBlockDate} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-ink/60 mb-1">Select Date to Block</label>
                  <input
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    required
                    className="w-full border border-sage/20 rounded-xl px-3 py-2 text-sm bg-paper/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full border border-amber/30 text-amber hover:bg-amber-light/30 rounded-full py-2.5 text-xs font-mono font-medium transition-colors"
                >
                  Block & Clear Slots
                </button>
              </form>
            </div>
          </div>

          {/* Current Published Slots List with Search & Pagination */}
          <div className="bg-white rounded-2xl border border-sage/15 p-6 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-sage/10">
              <div>
                <h2 className="font-display text-xl text-ink">Published Availability Hours</h2>
                <p className="text-xs text-ink/50">Withdraw or view your open and booked slots</p>
              </div>

              {/* Availability Search Bar */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={availabilitySearch}
                  onChange={(e) => {
                    setAvailabilitySearch(e.target.value);
                    setAvailabilityPage(1);
                  }}
                  placeholder="Search date, time, or status..."
                  className="w-full border border-sage/20 rounded-full pl-9 pr-8 py-2 text-xs bg-paper/40 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                />
                <svg className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
                </svg>
                {availabilitySearch && (
                  <button
                    onClick={() => {
                      setAvailabilitySearch("");
                      setAvailabilityPage(1);
                    }}
                    className="absolute right-3 top-2 text-xs text-ink/40 hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {paginatedSlots.length > 0 ? (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {paginatedSlots.map((slot) => {
                  const dateStr = new Date(slot.startTime).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  const timeStr = new Date(slot.startTime).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return (
                    <div
                      key={slot.id}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${slot.isBooked
                          ? "bg-sage-light/40 border-sage/20 text-ink/60"
                          : "bg-paper/40 border-sage/15 text-ink hover:border-sage/40"
                        }`}
                    >
                      <div>
                        <p className="font-mono text-xs font-semibold">{dateStr}</p>
                        <p className="text-xs text-ink/70">{timeStr}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide mt-1.5 ${
                          slot.isBooked ? "bg-sage-50 text-sage-dark ring-1 ring-sage/20" : "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            slot.isBooked ? "bg-sage" : "bg-sky-500"
                          }`} />
                          {slot.isBooked ? "Booked" : "Open"}
                        </span>
                      </div>

                      {!slot.isBooked && (
                        <button
                          onClick={() => handleWithdrawSlot(slot.id)}
                          className="text-xs text-amber hover:text-amber/80 p-2 hover:bg-amber-light/30 rounded-lg transition-colors"
                          title="Withdraw slot"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink/40 py-8 text-center">
                {availabilitySearch ? `No availability slots found matching "${availabilitySearch}".` : "No availability slots published yet."}
              </p>
            )}

            {/* Availability Pagination Controls */}
            <PaginationControl
              currentPage={availabilityPage}
              totalPages={availabilityTotalPages}
              totalItems={filteredSlots.length}
              pageSize={AVAILABILITY_PER_PAGE}
              onPageChange={(page) => setAvailabilityPage(page)}
            />
          </div>
        </div>
      )}

      {/* ── Tab 3: Sessions & Calendar View ───────────────────────────────── */}
      {activeTab === "sessions" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sage/10 pb-4">
            <h2 className="font-display text-xl text-ink">Session Calendar & Bookings</h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Session Search Bar */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => {
                    setSessionSearch(e.target.value);
                    setSessionPage(1);
                  }}
                  placeholder="Search client, email, phone, date..."
                  className="w-full border border-sage/20 rounded-full pl-9 pr-8 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                />
                <svg className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
                </svg>
                {sessionSearch && (
                  <button
                    onClick={() => {
                      setSessionSearch("");
                      setSessionPage(1);
                    }}
                    className="absolute right-3 top-2 text-xs text-ink/40 hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-1.5 text-xs font-mono shrink-0">
                {(["all", "upcoming", "past"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setSessionFilter(f);
                      setSessionPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg uppercase ${sessionFilter === f ? "bg-sage text-white font-medium" : "bg-white border border-sage/20 text-ink/60 hover:bg-sage-light/30"
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {paginatedSessions.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {paginatedSessions.map((s) => {
                const dt = new Date(s.startTime);
                const formattedDate = dt.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const formattedTime = dt.toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-sage/15 p-5 shadow-soft space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-display text-lg text-ink">{s.visitorName}</p>
                          <p className="text-xs text-ink/60">{s.visitorEmail} · {s.visitorPhone}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                          s.status === "CONFIRMED" ? "bg-sage-50 text-sage-dark ring-1 ring-sage/20" :
                          s.status === "CANCELLED" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" :
                          s.status === "COMPLETED" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60" :
                          s.status === "PENDING"   ? "bg-amber-50 text-amber ring-1 ring-amber/20" :
                                                     "bg-ink/5 text-ink/60 ring-1 ring-ink/5"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            s.status === "CONFIRMED" ? "bg-sage" :
                            s.status === "CANCELLED" ? "bg-rose-500" :
                            s.status === "COMPLETED" ? "bg-sky-500" :
                            s.status === "PENDING"   ? "bg-amber" : "bg-ink/30"
                          }`} />
                          {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                        </span>
                      </div>

                      <div className="bg-paper/60 rounded-xl p-3 text-xs space-y-1 font-mono text-ink/70">
                        <p>Date: {formattedDate}</p>
                        <p>Time: {formattedTime}</p>
                        <p>Fee: ₹{s.fee}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link
                        href={s.roomUrl}
                        className="flex-1 bg-sage text-white text-center py-2.5 rounded-full text-xs font-medium hover:bg-sage-dark transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        Access Video Room
                      </Link>

                      <button
                        onClick={() => {
                          setActiveTab("notes");
                          handleSelectSessionForNotes(s.id);
                        }}
                        className="px-4 border border-sage/20 text-ink/70 hover:text-ink text-xs rounded-full hover:bg-sage-light/50 transition-colors"
                      >
                        {s.hasNote ? "Edit Note" : "+ Note"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-sage/15 p-12 text-center text-xs text-ink/40">
              {sessionSearch
                ? `No sessions found matching "${sessionSearch}".`
                : `No ${sessionFilter} sessions found.`}
            </div>
          )}

          {/* Sessions Pagination Controls */}
          <PaginationControl
            currentPage={sessionPage}
            totalPages={sessionsTotalPages}
            totalItems={filteredSessions.length}
            pageSize={SESSIONS_PER_PAGE}
            onPageChange={(page) => setSessionPage(page)}
          />
        </div>
      )}

      {/* ── Tab 4: Private Session Notes ──────────────────────────────────── */}
      {activeTab === "notes" && (
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
          {/* List of sessions to select */}
          <div className="bg-white rounded-2xl border border-sage/15 p-5 shadow-soft h-fit">
            <h2 className="font-display text-lg text-ink mb-1">Select Session</h2>
            <p className="text-xs text-ink/50 mb-4">Choose a booking to view or write notes</p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSessionForNotes(s.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${selectedBookingId === s.id
                      ? "bg-sage text-white border-sage"
                      : "bg-paper/40 border-sage/15 hover:bg-sage-light/30"
                    }`}
                >
                  <p className="font-semibold">{s.visitorName}</p>
                  <p className="opacity-80 text-[11px] font-mono">
                    {new Date(s.startTime).toLocaleDateString()}
                  </p>
                  {s.hasNote && <span className="inline-block mt-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Has Note</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Notes Editor */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-sage/15 p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl text-ink">Private Session Notes</h2>
                <p className="text-xs text-ink/50">
                  Visible ONLY to you ({counsellor.name}). Encrypted & confidential.
                </p>
              </div>
              {noteSavedAt && <span className="text-xs font-mono text-sage-dark">Last saved: {noteSavedAt}</span>}
            </div>

            {selectedBookingId ? (
              <div className="space-y-4">
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  rows={12}
                  className="w-full border border-sage/20 rounded-xl p-4 text-sm bg-paper/30 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage leading-relaxed"
                  placeholder="Type clinical observations, progress notes, action items, or session summary..."
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNote}
                    disabled={noteLoading}
                    className="bg-sage text-white px-6 py-2.5 rounded-full text-xs font-mono font-medium hover:bg-sage-dark transition-colors disabled:opacity-50"
                  >
                    {noteLoading ? "Saving..." : "Save Private Note"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-ink/40">
                Select a session from the list on the left to start writing notes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 5: Profile Management & Approval ───────────────────────────── */}
      {activeTab === "profile" && (
        <div className="max-w-2xl bg-white rounded-2xl border border-sage/15 p-8 shadow-soft animate-fade-in">
          <div className="mb-6 pb-4 border-b border-sage/10">
            <h2 className="font-display text-2xl text-ink mb-1">Profile Management</h2>
            <p className="text-xs text-ink/50">
              Update biography, photograph, specialisation, languages, and session fee.
            </p>
          </div>

          {/* Admin Approval Notice Badge */}
          {counsellor.pendingApproval && (
            <div className="mb-6 bg-amber-light/70 border border-amber/30 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <span className="text-lg">⏳</span>
              <div>
                <p className="font-semibold mb-0.5">Pending Platform Administrator Approval</p>
                <p className="text-[11px] opacity-80">
                  Your submitted profile modifications are currently under review by the platform administrator.
                  Existing approved profile remains active until approved.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase text-ink/60 mb-1.5">
                Biography & Approach
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={5}
                className="w-full border border-sage/20 rounded-xl p-3 text-sm bg-paper/40 text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1.5">
                  Session Fee (₹)
                </label>
                <input
                  type="number"
                  value={editFee}
                  onChange={(e) => setEditFee(Number(e.target.value))}
                  className="w-full border border-sage/20 rounded-xl p-3 text-sm bg-paper/40 text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1.5">
                  Specialisation
                </label>
                <input
                  type="text"
                  value={editSpec}
                  onChange={(e) => setEditSpec(e.target.value)}
                  className="w-full border border-sage/20 rounded-xl p-3 text-sm bg-paper/40 text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-ink/60 mb-1.5">
                Languages (comma separated)
              </label>
              <input
                type="text"
                value={editLang}
                onChange={(e) => setEditLang(e.target.value)}
                className="w-full border border-sage/20 rounded-xl p-3 text-sm bg-paper/40 text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                placeholder="English, Hindi, Gujarati"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1.5">
                  Photograph URL
                </label>
                <input
                  type="url"
                  value={editPhoto}
                  onChange={(e) => setEditPhoto(e.target.value)}
                  className="w-full border border-sage/20 rounded-xl p-3 text-sm bg-paper/40 text-ink focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="shrink-0 flex flex-col items-center">
                <p className="text-[10px] font-mono uppercase text-ink/40 mb-1.5 self-start">Preview</p>
                {editPhoto ? (
                  <img
                    src={editPhoto}
                    alt="Profile Preview"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    className="w-12 h-12 rounded-full object-cover border border-sage/20 ring-2 ring-sage/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center font-display text-sm text-sage-dark border border-sage/20 ring-2 ring-sage/10">
                    {(counsellor.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-sage/10">
              <button
                type="submit"
                className="bg-sage text-white px-6 py-3 rounded-full text-xs font-mono font-medium hover:bg-sage-dark transition-colors active:scale-[0.98]"
              >
                Submit Profile Updates for Approval
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Transaction & Receipt Details Modal ────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-sage/20 p-6 md:p-8 max-w-lg w-full shadow-soft-lg space-y-6 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-sage/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-sage font-semibold tracking-wider">
                  Payment Receipt & Transaction Info
                </span>
                <h3 className="font-display text-xl text-ink mt-0.5">
                  {selectedRecord.visitorName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-sage-light/50 text-ink/60 hover:text-ink flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Receipt Summary Grid */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-paper/60 p-4 rounded-2xl border border-sage/10">
                <div>
                  <p className="font-mono text-[10px] uppercase text-ink/40">Mode of Payment</p>
                  <p className="font-bold text-sage-dark text-sm mt-0.5">
                    {selectedRecord.paymentMode === "UPI"
                      ? "UPI (Google Pay / PhonePe)"
                      : selectedRecord.paymentMode === "Wallet"
                        ? "Mobile Wallet"
                        : selectedRecord.paymentMode === "Netbanking"
                          ? "Netbanking"
                          : "Credit / Debit Card"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-ink/40">Amount Collected</p>
                  <p className="font-mono font-bold text-ink text-sm mt-0.5">
                    ₹{selectedRecord.amount}
                  </p>
                </div>
              </div>

              <div className="space-y-2 font-mono bg-white p-4 rounded-2xl border border-sage/15 text-ink/80">
                <div className="flex justify-between">
                  <span className="text-ink/40">Receipt Number:</span>
                  <span className="font-semibold text-sage-dark">REC-2026-{(selectedRecord.id).slice(0, 6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink/40">Transaction Status:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                    selectedRecord.status === "COMPLETED" || selectedRecord.status === "SUCCESS" || selectedRecord.status === "CONFIRMED" ? "bg-sage-50 text-sage-dark ring-1 ring-sage/20" :
                    selectedRecord.status === "FAILED" || selectedRecord.status === "CANCELLED" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60" :
                    "bg-amber-50 text-amber ring-1 ring-amber/20"
                  }`}>
                    <span className={`w-1 h-1 rounded-full mr-1 ${
                      selectedRecord.status === "COMPLETED" || selectedRecord.status === "SUCCESS" || selectedRecord.status === "CONFIRMED" ? "bg-sage" :
                      selectedRecord.status === "FAILED" || selectedRecord.status === "CANCELLED" ? "bg-rose-500" :
                      "bg-amber"
                    }`} />
                    {selectedRecord.status.charAt(0) + selectedRecord.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/40">Payment Ref ID:</span>
                  <span className="text-ink truncate max-w-[180px]">{selectedRecord.paymentId || selectedRecord.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/40">Session Date:</span>
                  <span className="text-ink">{selectedRecord.date} {selectedRecord.time ? `(${selectedRecord.time})` : ""}</span>
                </div>
                {selectedRecord.visitorEmail && (
                  <div className="flex justify-between">
                    <span className="text-ink/40">Client Email:</span>
                    <span className="text-ink truncate max-w-[180px]">{selectedRecord.visitorEmail}</span>
                  </div>
                )}
                {selectedRecord.visitorPhone && (
                  <div className="flex justify-between">
                    <span className="text-ink/40">Client Phone:</span>
                    <span className="text-ink">{selectedRecord.visitorPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`${API_BASE}${selectedRecord.receiptUrl || `/api/bookings/${selectedRecord.id}/receipt`}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-sage text-white text-center py-3 rounded-full text-xs font-mono font-medium hover:bg-sage-dark transition-colors flex items-center justify-center gap-2"
              >
                View / Download PDF Receipt
              </a>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-3 border border-sage/20 text-ink/70 hover:text-ink text-xs font-mono rounded-full hover:bg-sage-light/40 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
