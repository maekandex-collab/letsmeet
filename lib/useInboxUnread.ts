"use client";

import { useEffect, useState } from "react";
import { getAllInboxEntries, getInboxEntry, getTotalUnreadCount } from "@/lib/chatInbox";

export function useTotalUnread(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(getTotalUnreadCount());
    refresh();
    window.addEventListener("lm-inbox-change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("lm-inbox-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return count;
}

export function useInboxMap(): Record<string, ReturnType<typeof getInboxEntry>> {
  const [map, setMap] = useState<Record<string, NonNullable<ReturnType<typeof getInboxEntry>>>>({});

  useEffect(() => {
    const refresh = () => {
      const entries = getAllInboxEntries();
      const next: Record<string, NonNullable<ReturnType<typeof getInboxEntry>>> = {};
      for (const e of entries) next[e.roomId] = e;
      setMap(next);
    };
    refresh();
    window.addEventListener("lm-inbox-change", refresh);
    return () => window.removeEventListener("lm-inbox-change", refresh);
  }, []);

  return map;
}
