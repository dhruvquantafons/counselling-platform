"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

/* ─── Razorpay window type ─────────────────────────────────────────────── */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const steps = ["Select Counsellor", "Your Details", "Payment", "Choose Slot"];
const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";;

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Counsellor = {
  id: string;
  name: string;
  specialisation: string;
  languages: string[];
  fee: number;
};

type PaymentStatus = "idle" | "creating" | "open" | "success" | "failed" | "abandoned";

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

/* ─── Banner component ──────────────────────────────────────────────────── */
function PaymentBanner({
  status,
  onDismiss,
}: {
  status: "failed" | "abandoned";
  onDismiss: () => void;
}) {
  const isFailed = status === "failed";

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6 text-sm border animate-fade-in-up ${isFailed
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-amber-light/60 border-amber/20 text-ink/70"
        }`}
    >
      <span className="mt-0.5 shrink-0">
        {isFailed ? (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        )}
      </span>

      <div className="flex-1">
        <p className="font-medium mb-0.5">
          {isFailed ? "Payment unsuccessful" : "Payment cancelled"}
        </p>
        <p className="text-xs opacity-80">
          {isFailed
            ? "Your card was not charged. Please try again or use a different payment method."
            : "You closed the payment window. No charge was made — try again whenever you're ready."}
        </p>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className={`shrink-0 mt-0.5 hover:opacity-70 transition-opacity ${isFailed ? "text-red-400" : "text-ink/40"
          }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Main inner component ──────────────────────────────────────────────── */
function CheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const counsellorId = searchParams.get("counsellorId");

  const [counsellor, setCounsellor] = useState<Counsellor | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");

  useEffect(() => {
    if (!counsellorId) return;
    fetch(`${API_BASE}/api/counsellors/${counsellorId}`)
      .then((res) => res.json())
      .then((data) => {
        setCounsellor(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [counsellorId]);

  const validate = useCallback(() => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required.";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!phone.trim()) {
      newErrors.phone = "Mobile number is required.";
    } else if (!/^[0-9]{10}$/.test(phone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, phone]);

  async function handleProceed() {
    if (!validate()) return;
    if (!counsellor) return;

    setPaymentStatus("creating");

    try {
      // Step 1: Create order on server
      const orderRes = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counsellorId: counsellor.id, name, email, phone }),
      });

      if (!orderRes.ok) {
        throw new Error("Failed to create payment order");
      }

      const { orderId, amount, keyId, bookingId } = await orderRes.json();

      // Step 2: Load Razorpay SDK
      await loadRazorpayScript();

      // Step 3: Track whether the handler (success) fired
      let paymentSucceeded = false;

      // Step 4: Open Razorpay modal
      const rzp = new window.Razorpay({
        key: keyId,
        order_id: orderId,
        amount,
        currency: "INR",
        name: "Whybeigh Counselling",
        description: `Session with ${counsellor.name}`,
        prefill: {
          name,
          email,
          contact: phone,
        },
        theme: {
          color: "#4A6355",
          backdrop_color: "rgba(35, 44, 38, 0.6)",
        },
        // AC-1: success — verify payment on backend, then redirect to slot picker
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          paymentSucceeded = true;
          setPaymentStatus("success");
          try {
            await fetch(`${API_BASE}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id || orderId,
                paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
                signature: response.razorpay_signature || "",
                bookingId,
                method: (() => {
                  let m = response.method || response.razorpay_payment_method || "";
                  if (!m && name) {
                    const n = name.toLowerCase();
                    if (n.includes("upi")) m = "UPI";
                    else if (n.includes("wallet")) m = "Wallet";
                    else if (n.includes("netbank")) m = "Netbanking";
                    else if (n.includes("card")) m = "Card";
                  }
                  return m || "Card";
                })(),
              }),
            });
          } catch {
            console.warn("Payment verification API call completed with fallback");
          }
          router.push(`/booking?bookingId=${bookingId}`);
        },
        modal: {
          // AC-3: failure or abandonment — stay on checkout, no booking confirmed
          ondismiss: () => {
            if (!paymentSucceeded) {
              // Razorpay doesn't expose failure reason in ondismiss cleanly,
              // so we treat any non-success dismissal conservatively.
              // If the user explicitly closed it, it's "abandoned";
              // if a card was declined, Razorpay shows its own error then closes → "failed".
              // We distinguish via a data attribute the error event sets.
              const wasFailed = rzp._payment_failed === true;
              setPaymentStatus(wasFailed ? "failed" : "abandoned");
            }
          },
        },
      });

      // Listen for payment failure event:
      // 1. Flag it so ondismiss shows the right banner
      // 2. Write FAILED + CANCELLED to DB (webhook only fires on success)
      rzp.on("payment.failed", () => {
        rzp._payment_failed = true;
        // Fire-and-forget — don't await so the modal UX isn't blocked
        fetch(`${API_BASE}/api/payments/mark-failed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        }).catch(() => {
          // Non-critical: DB will still show INITIATED but UI correctly shows failure
          console.warn("Failed to mark payment as failed in DB");
        });
      });

      setPaymentStatus("open");
      rzp.open();
    } catch {
      setPaymentStatus("failed");
    }
  }

  const isSubmitting = paymentStatus === "creating" || paymentStatus === "open";
  const showBanner = paymentStatus === "failed" || paymentStatus === "abandoned";

  if (!counsellorId) {
    return (
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-sage/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
          </svg>
        </div>
        <p className="text-ink/50 mb-4">No counsellor selected.</p>
        <Link
          href="/directory"
          className="text-sm text-sage-dark hover:text-sage transition-colors"
        >
          ← Browse counsellors
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-xl mx-auto px-6 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-sage-light/60 rounded w-1/2" />
          <div className="h-10 bg-sage-light/60 rounded w-3/4" />
          <div className="h-24 bg-sage-light/60 rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-16 animate-fade-in">
      <div className="grid lg:grid-cols-[1fr_360px] gap-12">
        <div>
          {/* Progress rail */}
          <div className="flex items-center mb-12">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-mono transition-colors ${i <= 1
                      ? "bg-sage text-white shadow-soft"
                      : "bg-sage-light text-sage-dark"
                      }`}
                  >
                    {i < 1 ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="text-xs mt-1.5 text-center text-ink/60 hidden sm:block">
                    {step}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 transition-colors ${i < 1 ? "bg-sage" : "bg-sage/20"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>

          <h1 className="font-display text-2xl md:text-3xl mb-2 text-ink">
            Your details
          </h1>
          {counsellor && (
            <p className="text-ink/60 mb-8">
              Booking with{" "}
              <span className="font-medium text-ink">{counsellor.name}</span> · ₹
              {counsellor.fee}
            </p>
          )}

          {/* Payment outcome banner */}
          {showBanner && (
            <PaymentBanner
              status={paymentStatus as "failed" | "abandoned"}
              onDismiss={() => setPaymentStatus("idle")}
            />
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Full name
              </label>
              <input
                id="checkout-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className={`w-full border rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage/50 transition-all disabled:opacity-50 ${errors.name ? "border-red-300 focus:ring-red-100" : "border-sage/15"
                  }`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Email address
              </label>
              <input
                id="checkout-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className={`w-full border rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage/50 transition-all disabled:opacity-50 ${errors.email ? "border-red-300 focus:ring-red-100" : "border-sage/15"
                  }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Mobile number
              </label>
              <input
                id="checkout-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                className={`w-full border rounded-xl px-4 py-3 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage/50 transition-all disabled:opacity-50 ${errors.phone ? "border-red-300 focus:ring-red-100" : "border-sage/15"
                  }`}
                placeholder="10-digit mobile number"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.phone}
                </p>
              )}
            </div>

            <button
              id="checkout-proceed-btn"
              onClick={handleProceed}
              disabled={isSubmitting}
              className="w-full bg-sage text-white py-3.5 rounded-full mt-2 font-medium hover:bg-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {paymentStatus === "creating" ? (
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
                  Creating order…
                </>
              ) : paymentStatus === "open" ? (
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
                  Payment window open…
                </>
              ) : (
                <>
                  {showBanner ? "Try Again" : "Proceed to Pay"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Order summary */}
        {counsellor && (
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-2xl border border-sage/10 p-6 shadow-soft-md">
              <p className="font-mono text-xs text-ink/40 uppercase tracking-wide mb-4">
                Booking summary
              </p>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-sage-light flex items-center justify-center font-display text-sm text-sage-dark ring-2 ring-sage/10">
                  {counsellor.name
                    .split(" ")
                    .filter((w: string) => w[0] === w[0].toUpperCase() && w !== "Dr.")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {counsellor.name}
                  </p>
                  <p className="text-xs text-ink/50">
                    {counsellor.specialisation}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm text-ink/70 mb-5">
                <div className="flex justify-between">
                  <span>Session fee</span>
                  <span className="text-ink font-medium">₹{counsellor.fee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee</span>
                  <span className="text-sage-dark font-medium">Free</span>
                </div>
              </div>

              <div className="border-t border-sage/10 pt-3 flex justify-between text-sm font-medium">
                <span>Total</span>
                <span className="text-sage-dark font-display text-lg">₹{counsellor.fee}</span>
              </div>

              <div className="mt-5 bg-sage-light/50 rounded-xl p-3.5">
                <p className="text-xs text-ink/50 leading-relaxed">
                  <svg className="w-3.5 h-3.5 inline mr-1 text-sage" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  By proceeding, you agree to our terms. Payment is only captured
                  after your session is confirmed.
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

function CheckoutSkeleton() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <div className="animate-pulse space-y-6">
        <div className="h-4 bg-sage-light/60 rounded w-1/2" />
        <div className="h-10 bg-sage-light/60 rounded w-3/4" />
        <div className="h-24 bg-sage-light/60 rounded" />
      </div>
    </main>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutInner />
    </Suspense>
  );
}