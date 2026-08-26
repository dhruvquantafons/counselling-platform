"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE = "http://localhost:4000";

type BookingDetail = {
  id: string;
  counsellorId: string;
  counsellorName: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  startTime: string;
  status: string;
};

type AvailableSlot = {
  id: string;
  date: string;
  time: string;
  period: string;
};

type WindowState = "JOINABLE" | "FUTURE" | "ENDED";

function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatDateShort(iso: string | Date): string {
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function getSessionWindowState(startTimeIso: string): {
  state: WindowState;
  msUntilOpen: number;
  msAgoEnded: number;
  sessionEndsAt: Date;
  earlyEntryAt: Date;
} {
  const SESSION_MIN = 50;
  const EARLY_MIN = 5;
  const start = new Date(startTimeIso).getTime();
  const now = Date.now();
  const earlyEntryAt = new Date(start - EARLY_MIN * 60_000);
  const sessionEndsAt = new Date(start + SESSION_MIN * 60_000);
  const msUntilOpen = earlyEntryAt.getTime() - now;
  const msAgoEnded = now - sessionEndsAt.getTime();
  if (now > sessionEndsAt.getTime()) return { state: "ENDED", msUntilOpen, msAgoEnded, sessionEndsAt, earlyEntryAt };
  if (now < earlyEntryAt.getTime()) return { state: "FUTURE", msUntilOpen, msAgoEnded, sessionEndsAt, earlyEntryAt };
  return { state: "JOINABLE", msUntilOpen, msAgoEnded, sessionEndsAt, earlyEntryAt };
}

function BookingManageInner() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || searchParams.get("id");

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ──────── Phase 5.1: 30s live tick so the Join gate auto-flips while page is open ────────
  const [, setManageTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setManageTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchBooking = useCallback(() => {
    if (!bookingId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBooking(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Booking not found"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const loadSlotsForReschedule = useCallback(() => {
    if (!booking) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`${API_BASE}/api/counsellors/${booking.counsellorId}/availability?tz=${encodeURIComponent(tz)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAvailableSlots(data);
      });
  }, [booking]);

  useEffect(() => {
    if (showReschedule) {
      loadSlotsForReschedule();
    }
  }, [showReschedule, loadSlotsForReschedule]);

  async function handleCancelBooking() {
    if (!bookingId) return;
    if (!confirm("Are you sure you want to cancel this booking? Slot will be released.")) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel booking");

      setMessage({ text: data.message, type: "success" });
      fetchBooking();
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Error cancelling session", type: "error" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRescheduleBooking() {
    if (!bookingId || !selectedSlotId) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAvailabilityId: selectedSlotId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reschedule session");

      setMessage({ text: data.message, type: "success" });
      setShowReschedule(false);
      setSelectedSlotId(null);
      fetchBooking();
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Error rescheduling session", type: "error" });
    } finally {
      setActionLoading(false);
    }
  }

  if (!bookingId) {
    return (
      <main className="max-w-md mx-auto px-6 py-20 text-center animate-fade-in">
        <p className="text-ink/60 mb-4">No booking ID specified.</p>
        <Link href="/directory" className="text-sm font-medium text-sage-dark hover:text-sage">
          ← Browse counsellors
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-sage-light/60 rounded w-1/3" />
          <div className="h-40 bg-sage-light/60 rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="max-w-md mx-auto px-6 py-20 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          ✕
        </div>
        <h1 className="font-display text-xl text-ink mb-2">Booking Not Found</h1>
        <p className="text-xs text-ink/50 mb-6">{error}</p>
        <Link href="/directory" className="text-sm font-medium text-sage-dark">
          ← Back to directory
        </Link>
      </main>
    );
  }

  const dt = new Date(booking.startTime);
  const formattedDate = dt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = dt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const hoursUntilSession = (dt.getTime() - Date.now()) / (1000 * 60 * 60);
  const isWithinPolicy = hoursUntilSession >= 24;

  // ──────── Phase 5.1: time-window gate for Join Video Room button ────────
  const win = getSessionWindowState(booking.startTime);
  const joinable = booking.status === "CONFIRMED" && win.state === "JOINABLE";
  let joinLabel = "Join Video Room";
  let joinTooltip = "";
  if (booking.status !== "CONFIRMED") {
    joinLabel = "Confirm session first";
    joinTooltip = `This booking is ${booking.status.toLowerCase()}. Video room unlocks once the session is confirmed with a time slot.`;
  } else if (win.state === "FUTURE") {
    joinLabel = "Room not open yet";
    joinTooltip = `Opens 5 minutes before scheduled time · ${formatDateShort(win.earlyEntryAt)} (in ${formatDuration(win.msUntilOpen)})`;
  } else if (win.state === "ENDED") {
    joinLabel = "Session ended";
    joinTooltip = `Concluded ${formatDateShort(win.sessionEndsAt)}`;
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase text-sage font-medium">Session Booking Management</span>
          <h1 className="font-display text-3xl text-ink">Your Session Details</h1>
        </div>
        <span
          className={`font-mono text-xs px-3 py-1 rounded-full font-medium ${
            booking.status === "CONFIRMED"
              ? "bg-sage-light text-sage-dark"
              : booking.status === "CANCELLED"
              ? "bg-red-50 text-red-600"
              : "bg-amber-light text-amber"
          }`}
        >
          {booking.status}
        </span>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`mb-6 rounded-2xl p-4 text-xs font-medium flex items-center justify-between animate-fade-in-up ${
            message.type === "success"
              ? "bg-sage-light/70 text-sage-dark border border-sage/20"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-white rounded-3xl border border-sage/15 p-6 shadow-soft space-y-6">
        <div className="grid sm:grid-cols-2 gap-4 pb-6 border-b border-sage/10 text-sm">
          <div>
            <p className="text-xs font-mono uppercase text-ink/40 mb-1">Counsellor</p>
            <p className="font-display text-lg text-ink">{booking.counsellorName}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-ink/40 mb-1">Scheduled Time</p>
            <p className="font-medium text-ink">{formattedDate}</p>
            <p className="text-xs text-sage-dark font-mono mt-0.5">{formattedTime}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pb-6 border-b border-sage/10 text-xs text-ink/70">
          <div>
            <p className="font-mono text-[10px] uppercase text-ink/40">Visitor</p>
            <p className="font-medium text-ink">{booking.visitorName}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-ink/40">Email</p>
            <p className="font-medium text-ink">{booking.visitorEmail}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-ink/40">Phone</p>
            <p className="font-medium text-ink">{booking.visitorPhone}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          {/* Join Session ── Phase 5.1: time-window gated ── */}
          {booking.status === "CONFIRMED" && (
            joinable ? (
              <Link
                href={`/session?bookingId=${booking.id}`}
                className="bg-sage text-white px-5 py-2.5 rounded-full text-xs font-medium hover:bg-sage-dark transition-colors flex items-center gap-1.5 active:scale-[0.98]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                {joinLabel}
              </Link>
            ) : (
              <div
                role="link"
                aria-disabled="true"
                title={joinTooltip}
                className="bg-ink/5 text-ink/40 px-5 py-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-not-allowed ring-1 ring-ink/5 select-none"
              >
                <svg className="w-3.5 h-3.5 text-ink/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                {joinLabel}
              </div>
            )
          )}

          {/* View/Download PDF Receipt */}
          <a
            href={`${API_BASE}/api/bookings/${booking.id}/receipt`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-sage/20 text-ink/80 hover:text-ink px-5 py-2.5 rounded-full text-xs font-medium hover:bg-sage-light/50 transition-colors flex items-center gap-1.5"
          >
            📄 Download Official Receipt (PDF)
          </a>

          {/* Reschedule & Cancel buttons if booking is confirmed */}
          {booking.status === "CONFIRMED" && (
            <>
              <button
                onClick={() => setShowReschedule(!showReschedule)}
                className="border border-sage/20 text-ink/80 hover:text-ink px-4 py-2.5 rounded-full text-xs font-medium hover:bg-sage-light/50 transition-colors"
              >
                {showReschedule ? "Close Reschedule" : "Reschedule Session"}
              </button>

              <button
                onClick={handleCancelBooking}
                disabled={actionLoading}
                className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancel Session
              </button>
            </>
          )}
        </div>

        {/* 24-Hour Policy Notice */}
        {booking.status === "CONFIRMED" && (
          <div className={`rounded-2xl p-4 text-xs ${isWithinPolicy ? "bg-sage-light/40 border border-sage/15 text-ink/70" : "bg-amber-light/50 border border-amber/20 text-amber-900"}`}>
            <p className="font-medium mb-0.5">Cancellation & Rescheduling Policy</p>
            <p className="text-[11px] opacity-80">
              {isWithinPolicy
                ? "You can cancel or reschedule freely up to 24 hours before your session start time."
                : "Your session is within 24 hours. Self-service rescheduling/cancellation is locked per policy limits. Please contact support if you need assistance."}
            </p>
          </div>
        )}
      </div>

      {/* Reschedule Slot Selector Section */}
      {showReschedule && booking.status === "CONFIRMED" && (
        <div className="mt-6 bg-white rounded-3xl border border-sage/15 p-6 shadow-soft space-y-4 animate-fade-in">
          <h2 className="font-display text-xl text-ink">Select New Time Slot</h2>
          <p className="text-xs text-ink/50">Choose a new available hour to reschedule your session with {booking.counsellorName}.</p>

          {availableSlots.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pt-2">
              {availableSlots.map((s) => {
                const selected = selectedSlotId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSlotId(s.id)}
                    className={`p-3 rounded-xl border text-xs font-mono transition-all text-left ${
                      selected
                        ? "bg-sage text-white border-sage shadow-soft"
                        : "bg-paper/40 border-sage/15 hover:border-sage/40 text-ink"
                    }`}
                  >
                    <p className="font-medium">{s.date}</p>
                    <p className="opacity-80">{s.time} ({s.period})</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-ink/40 py-4 text-center">No alternative slots available right now.</p>
          )}

          {selectedSlotId && (
            <div className="pt-3 border-t border-sage/10 flex justify-end">
              <button
                onClick={handleRescheduleBooking}
                disabled={actionLoading}
                className="bg-sage text-white px-6 py-2.5 rounded-full text-xs font-medium hover:bg-sage-dark transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function BookingManage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-16 text-center text-xs text-ink/40">Loading booking manager...</div>}>
      <BookingManageInner />
    </Suspense>
  );
}
