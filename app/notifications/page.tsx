"use client";

import UnreadBadge from "@/components/UnreadBadge";

import { useEffect, useState } from "react";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {
  extractError,
  getNotificationList,
  isLoggedIn,
  markNotificationRead,
  type Notification,
} from "@/lib/letsmeet";

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
}

function notificationType(header: string): "match" | "like" | "message" {
  const h = header.toLowerCase();
  if (h.includes("match")) return "match";
  if (h.includes("like")) return "like";
  if (h.includes("message") || h.includes("chat")) return "message";
  return "message";
}

const iconMap: Record<string, { bg: string; svg: React.ReactNode }> = {
  match: {
    bg: "bg-primary",
    svg: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  like: {
    bg: "bg-rose-500",
    svg: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  message: {
    bg: "bg-accent",
    svg: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z"
          fill="white"
        />
      </svg>
    ),
  },
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      setError("Please sign in to view notifications.");
      return;
    }

    let cancelled = false;

    (async () => {
      const res = await getNotificationList();
      if (cancelled) return;

      if (!res.ok) {
        setError(extractError(res.data, "Could not load notifications."));
        setLoading(false);
        return;
      }

      setItems(res.data.items ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = items.filter((n) => !n.is_read).length;
  const unread = items.filter((n) => !n.is_read);
  const earlier = items.filter((n) => n.is_read);

  const markRead = async (id: number) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationRead(id);
  };

  return (
    <div className="mobile-shell flex flex-col min-h-dvh bg-white">
      <LogoHeader
        right={
          unreadCount > 0 ? <UnreadBadge count={unreadCount} /> : null
        }
      />

      <div className="flex-1 overflow-y-auto pt-header pb-bottom-nav">
        {loading && (
          <p className="px-5 pt-6 text-sm text-muted">Loading notifications…</p>
        )}

        {error && (
          <p className="px-5 pt-6 text-sm text-rose-600">{error}</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="px-5 pt-6 text-sm text-muted">No notifications yet.</p>
        )}

        {unread.length > 0 && (
          <div>
            <p className="px-5 pt-4 pb-2 text-xs font-bold text-muted uppercase tracking-wider">
              New
            </p>
            {unread.map((n) => (
              <NotifRow key={n.id} n={n} onRead={() => markRead(n.id)} />
            ))}
          </div>
        )}

        {earlier.length > 0 && (
          <div>
            <p className="px-5 pt-5 pb-2 text-xs font-bold text-muted uppercase tracking-wider">
              Earlier
            </p>
            {earlier.map((n) => (
              <NotifRow key={n.id} n={n} onRead={() => markRead(n.id)} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function NotifRow({ n, onRead }: { n: Notification; onRead: () => void }) {
  const type = notificationType(n.header);
  const icon = iconMap[type];

  return (
    <button
      type="button"
      onClick={() => {
        if (!n.is_read) onRead();
      }}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left ${!n.is_read ? "bg-primary-light/40" : ""}`}
    >
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center text-lg font-bold text-primary">
          {n.header.charAt(0).toUpperCase()}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${icon.bg} flex items-center justify-center border-2 border-white`}
        >
          {icon.svg}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-dark" : "font-medium text-dark/80"}`}
        >
          <span className="block text-xs text-muted mb-0.5">{n.header}</span>
          {n.message}
        </p>
        <p className="text-xs text-muted mt-0.5">{formatRelativeTime(n.created_at)}</p>
      </div>

      {!n.is_read && (
        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );
}
