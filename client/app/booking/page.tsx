"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Slot = {
  id: string;
  startTimeUtc: string;
  endTimeUtc: string;
  date: string;
  time: string;
  period: "Morning" | "Afternoon" | "Evening";
};

type BookingInfo = {
  id: string;
  counsellorId: string;
  counsellorName: string;
  visitorName: string;
  status: string;
};

type DateGroup = {
  date: string;
  slots: Slot[];
};

/* ─── Period icons ───────────────────────────────────────────────────────── */
const periodIcons: Record<string, React.ReactNode> = {
  Morning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  Afternoon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  ),
  Evening: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function groupByDate(slots: Slot[]): DateGroup[] {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    if (!map.has(slot.date)) map.set(slot.date, []);
    map.get(slot.date)!.push(slot);
  }
  return Array.from(map.entries()).map(([date, slots]) => ({ date, slots }));
}

/* ─── Main inner component ──────────────────────────────────────────────── */
function SlotPickerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Detect visitor's timezone
  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Step 1: load booking info
  useEffect(() => {
    if (!bookingId) {
      setLoadingBooking(false);
      return;
    }
    fetch(`${API_BASE}/api/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBooking(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingBooking(false));
  }, [bookingId]);

  // Step 2: load slots once we know the counsellor
  useEffect(() => {
    if (!booking) return;
    setLoadingSlots(true);
    fetch(
      `${API_BASE}/api/counsellors/${booking.counsellorId}/availability?tz=${encodeURIComponent(visitorTz)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSlots(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [booking, visitorTz]);

  // Step 3: confirm slot
  async function handleConfirm() {
    if (!selectedSlot || !bookingId) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/slot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityId: selectedSlot.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm slot");
      setConfirmed(true);
      // Brief delay so the user sees the success state before redirect
      setTimeout(() => router.push(`/session?bookingId=${encodeURIComponent(bookingId)}`), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  }

  /* ── No bookingId ──────────────────────────────────────────────────────── */
  if (!bookingId) {
    return (
      <main className="max-w-lg mx-auto px-6 py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-sage/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
          </svg>
        </div>
        <p className="text-ink/50 mb-4">No booking found. Complete payment first.</p>
        <Link href="/directory" className="text-sm text-sage-dark hover:text-sage transition-colors">
          ← Browse counsellors
        </Link>
      </main>
    );
  }

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (loadingBooking || loadingSlots) {
    return (
      <main className="max-w-lg mx-auto px-6 py-16">
        <div className="animate-pulse space-y-8">
          <div className="text-center space-y-3">
            <div className="h-3 bg-sage-light/60 rounded w-24 mx-auto" />
            <div className="h-8 bg-sage-light/60 rounded w-48 mx-auto" />
            <div className="h-4 bg-sage-light/60 rounded w-64 mx-auto" />
          </div>
          {[1, 2].map((g) => (
            <div key={g} className="space-y-3">
              <div className="h-3 bg-sage-light/60 rounded w-20" />
              <div className="flex flex-wrap gap-2.5">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="h-11 w-24 bg-sage-light/60 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  /* ── Confirmed state ───────────────────────────────────────────────────── */
  if (confirmed && selectedSlot) {
    return (
      <main className="max-w-lg mx-auto px-6 py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-sage flex items-center justify-center mx-auto mb-5 shadow-soft-lg">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-display text-2xl text-ink mb-2">Slot confirmed!</h1>
        <p className="text-ink/60 text-sm">
          {selectedSlot.date} · {selectedSlot.time}
        </p>
        <p className="text-ink/40 text-xs mt-4">Redirecting to your session…</p>
      </main>
    );
  }

  const dateGroups = groupByDate(slots);
  const tzLabel = visitorTz.replace(/_/g, " ");

  return (
    <main className="max-w-lg mx-auto px-6 py-16 animate-fade-in">
      {/* Header */}
      <header className="mb-10 text-center">
        <p className="font-mono text-xs text-sage-dark uppercase tracking-wide mb-2">
          Step 3 of 4
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-3 text-ink">
          Choose your slot.
        </h1>
        {booking && (
          <p className="text-sm text-ink/60 max-w-sm mx-auto">
            With{" "}
            <span className="font-medium text-ink">{booking.counsellorName}</span>
            {" "}· shown in your timezone ({tzLabel})
          </p>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm flex items-center gap-2 animate-fade-in-up">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Empty state */}
      {slots.length === 0 && !loadingSlots && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-sage/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-ink/50 text-sm">No available slots right now.</p>
          <p className="text-ink/30 text-xs mt-1">Please check back later or contact us.</p>
        </div>
      )}

      {/* Slot groups by date */}
      {dateGroups.length > 0 && (
        <div className="space-y-10">
          {dateGroups.map(({ date, slots: daySlots }) => {
            // Group within each day by period
            const periods = ["Morning", "Afternoon", "Evening"] as const;
            const byPeriod = Object.fromEntries(
              periods.map((p) => [p, daySlots.filter((s) => s.period === p)])
            );
            const hasAny = periods.some((p) => byPeriod[p].length > 0);
            if (!hasAny) return null;

            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-sage-light/70 rounded-xl px-3 py-1.5">
                    <p className="font-mono text-xs font-medium text-sage-dark uppercase tracking-wide">
                      {date}
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-sage/10" />
                </div>

                <div className="space-y-6">
                  {periods.map((period) => {
                    const periodSlots = byPeriod[period];
                    if (!periodSlots.length) return null;
                    return (
                      <div key={period}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sage-dark">{periodIcons[period]}</span>
                          <p className="text-xs font-mono text-ink/40 uppercase tracking-wide">
                            {period}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {periodSlots.map((slot) => {
                            const isSelected = selectedSlot?.id === slot.id;
                            return (
                              <button
                                key={slot.id}
                                id={`slot-${slot.id}`}
                                onClick={() => setSelectedSlot(isSelected ? null : slot)}
                                className={`font-mono text-sm rounded-full px-5 py-3 transition-all duration-200 active:scale-[0.97] ${isSelected
                                    ? "bg-sage text-white border-2 border-sage shadow-soft"
                                    : "border border-sage/20 bg-white text-ink hover:bg-sage hover:text-white hover:border-sage hover:shadow-soft"
                                  }`}
                              >
                                {slot.time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky confirm footer */}
      <div
        className={`mt-12 transition-all duration-300 ${selectedSlot ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
      >
        {selectedSlot && (
          <div className="bg-white border border-sage/15 rounded-2xl p-4 shadow-soft-md flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-ink/40 uppercase tracking-wide mb-0.5">
                Selected
              </p>
              <p className="text-sm font-medium text-ink">
                {selectedSlot.date} · {selectedSlot.time}
              </p>
            </div>
            <button
              id="confirm-slot-btn"
              onClick={handleConfirm}
              disabled={confirming}
              className="shrink-0 bg-sage text-white rounded-full px-6 py-2.5 text-sm font-medium hover:bg-sage-dark hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
            >
              {confirming ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Confirming…
                </>
              ) : (
                <>
                  Confirm slot
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href={bookingId ? `/checkout` : "/directory"}
          className="text-sm text-ink/50 hover:text-ink transition-colors duration-150"
        >
          ← Back
        </Link>
        {!selectedSlot && slots.length > 0 && (
          <>
            <span className="text-ink/20">|</span>
            <span className="text-xs text-ink/30">Select a slot to continue</span>
          </>
        )}
      </div>
    </main>
  );
}

function SlotPickerSkeleton() {
  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <div className="animate-pulse space-y-8">
        <div className="text-center space-y-3">
          <div className="h-3 bg-sage-light/60 rounded w-24 mx-auto" />
          <div className="h-8 bg-sage-light/60 rounded w-48 mx-auto" />
        </div>
        {[1, 2].map((g) => (
          <div key={g} className="space-y-3">
            <div className="h-3 bg-sage-light/60 rounded w-20" />
            <div className="flex flex-wrap gap-2.5">
              {[1, 2, 3].map((s) => (
                <div key={s} className="h-11 w-24 bg-sage-light/60 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function SlotPicker() {
  return (
    <Suspense fallback={<SlotPickerSkeleton />}>
      <SlotPickerInner />
    </Suspense>
  );
}
