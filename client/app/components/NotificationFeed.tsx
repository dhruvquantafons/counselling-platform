"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type NotificationItem = {
  id: string;
  bookingId: string;
  type: string;
  category: "payment" | "booking" | "session" | "cancellation";
  title: string;
  message: string;
  actionUrl: string;
  isRead: boolean;
  createdAt: string;
  scheduledFor: string;
  counsellorName?: string;
  visitorName?: string;
  startTime?: string;
};

interface NotificationFeedProps {
  bookingId?: string;
  visitorEmail?: string;
  counsellorId?: string;
  role: "visitor" | "counsellor";
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = Math.max(0, now.getTime() - past.getTime());
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export default function NotificationFeed({
  bookingId,
  visitorEmail,
  counsellorId,
  role,
}: NotificationFeedProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      let url = "";
      if (role === "visitor") {
        if (!bookingId && !visitorEmail) return;
        const query = bookingId
          ? `bookingId=${encodeURIComponent(bookingId)}`
          : `visitorEmail=${encodeURIComponent(visitorEmail || "")}`;
        url = `${API_BASE}/api/notifications/visitor?${query}`;
      } else {
        if (!counsellorId) return;
        url = `${API_BASE}/api/notifications/counsellor?counsellorId=${encodeURIComponent(counsellorId)}`;
      }

      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [bookingId, visitorEmail, counsellorId, role]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, counsellorId }),
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (category: NotificationItem["category"]) => {
    switch (category) {
      case "payment":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/60">Payment</span>;
      case "booking":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200/60">Booking</span>;
      case "session":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sage/15 text-sage-dark border border-sage/20">Session</span>;
      case "cancellation":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200/60">Notice</span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative p-2 rounded-full text-ink/70 hover:text-ink hover:bg-sage/10 transition-colors focus:outline-none"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Feed Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-sage/15 shadow-xl z-50 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="px-4 py-3 border-b border-sage/10 bg-paper/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-ink">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-sage/15 text-sage-dark text-[11px] font-mono font-medium px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-medium text-sage-dark hover:underline disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Feed List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-sage/10">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ink/50 text-xs">
                <p>No notifications yet</p>
                <p className="text-[11px] text-ink/40 mt-1">Payment receipts, session reminders, and booking updates will appear here.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                  className={`p-4 transition-colors hover:bg-paper/40 cursor-pointer ${
                    !item.isRead ? "bg-sage/5" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
                      )}
                      {getCategoryBadge(item.category)}
                    </div>
                    <span className="text-[11px] text-ink/40 font-mono shrink-0">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-ink mt-1">{item.title}</h4>
                  <p className="text-xs text-ink/70 mt-0.5 leading-relaxed">{item.message}</p>

                  <div className="mt-2 flex items-center justify-between">
                    {item.actionUrl ? (
                      <Link
                        href={item.actionUrl.replace(/^https?:\/\/[^\/]+/, "")}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-sage hover:text-sage-dark hover:underline"
                      >
                        Action Link &rarr;
                      </Link>
                    ) : (
                      <span />
                    )}

                    {!item.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="text-[11px] text-ink/40 hover:text-ink/80 transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
