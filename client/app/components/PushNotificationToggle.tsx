"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationToggle({ bookingId }: { bookingId: string }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      if ("serviceWorker" in navigator && Notification.permission === "granted") {
        navigator.serviceWorker.ready
          .then((reg) => reg.pushManager.getSubscription())
          .then((sub) => {
            if (sub) setSubscribed(true);
          })
          .catch(() => {});
      }
    }
  }, []);

  async function handleEnablePush() {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Browser push notifications are not supported in your current browser.");
      return;
    }

    setLoading(true);

    try {
      const resPerm = await Notification.requestPermission();
      setPermission(resPerm);

      if (resPerm !== "granted") {
        setLoading(false);
        return;
      }

      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Fetch VAPID public key
      const keyRes = await fetch(`${API_BASE}/api/push/vapid-public-key`);
      if (!keyRes.ok) {
        throw new Error(`Backend server returned HTTP ${keyRes.status}. Make sure the backend server is running.`);
      }
      const contentType = keyRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received HTML response instead of JSON. Ensure your backend server is restarted.");
      }

      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        alert("VAPID public key is missing on backend.");
        setLoading(false);
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subObj = sub.toJSON();

      // Post subscription to backend
      const subRes = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          subscription: subObj,
        }),
      });

      if (!subRes.ok) {
        const errJson = await subRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save push subscription to backend");
      }

      setSubscribed(true);
    } catch (err: any) {
      console.error("Failed to enable push notifications:", err);
      alert(`Push Notification Error: ${err.message || "Failed to subscribe"}`);
    } finally {
      setLoading(false);
    }
  }

  if (permission === "denied") {
    return (
      <div className="bg-paper/80 border border-sage/10 rounded-2xl p-4 text-xs text-ink/60 flex items-center justify-between">
        <span>Browser notifications are blocked in your browser settings.</span>
      </div>
    );
  }

  if (subscribed) {
    return (
      <div className="bg-sage/10 border border-sage/20 rounded-2xl p-4 text-xs text-sage-dark font-medium flex items-center justify-between">
        <span>Browser Session Reminders Enabled (24h, 1h & 10m alerts)</span>
        <span className="text-[10px] bg-sage text-white px-2 py-0.5 rounded-full font-mono">Active</span>
      </div>
    );
  }

  return (
    <div className="bg-paper/90 border border-sage/20 rounded-2xl p-4 text-xs text-ink/80 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-ink">Enable Instant Session Reminders</p>
        <p className="text-[11px] text-ink/60 mt-0.5">Receive browser alerts 24 hours, 1 hour, and 10 minutes before your appointment.</p>
      </div>
      <button
        onClick={handleEnablePush}
        disabled={loading}
        className="shrink-0 bg-sage hover:bg-sage-dark text-white px-3.5 py-2 rounded-full font-medium text-xs transition-colors disabled:opacity-50"
      >
        {loading ? "Enabling..." : "Enable Push Reminders"}
      </button>
    </div>
  );
}
