"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { deliverIncomingChatMessage } from "@/lib/chatDelivery";
import { pruneInboxToRooms, upsertInboxPeer } from "@/lib/chatInbox";
import { parseWsChatMessage } from "@/lib/chatWs";
import {
  callRoomIdsForMatch,
  chatRoomKey,
  chatWsUrl,
  fetchMatchedListCached,
  isLoggedIn,
  linkMatchRoomIds,
  resolveNumericRoomId,
  wsChatRoomIdsForMatch,
  type ProfileCard,
} from "@/lib/letsmeet";

function activeChatSegment(pathname: string): string | null {
  const m = pathname.match(/^\/chat\/([^/?]+)/);
  return m?.[1] ?? null;
}

function isViewingMatchChat(pathname: string, match: ProfileCard): boolean {
  const segment = activeChatSegment(pathname);
  if (!segment) return false;
  return callRoomIdsForMatch(match).includes(segment);
}

export default function GlobalChatListener() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const socketsRef = useRef<Map<string, WebSocket>>(new Map());
  const matchByRoomRef = useRef<Map<string, ProfileCard>>(new Map());
  const syncingRef = useRef(false);

  const syncListeners = useCallback(async () => {
    if (!isLoggedIn()) {
      socketsRef.current.forEach((ws) => ws.close());
      socketsRef.current.clear();
      matchByRoomRef.current.clear();
      return;
    }
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const matches = await fetchMatchedListCached();
      pruneInboxToRooms(matches.map((m) => chatRoomKey(m)));
      const nextRooms = new Set<string>();

      for (const match of matches) {
        const canonicalKey = chatRoomKey(match);
        const numeric = resolveNumericRoomId(match);
        if (numeric != null) {
          linkMatchRoomIds(numeric, [match.chatroom_id, canonicalKey]);
        }

        upsertInboxPeer(canonicalKey, {
          userId: match.user_id,
          name: match.name,
          photo: match.profile_photo,
        });

        const roomIds = wsChatRoomIdsForMatch(match);
        for (const roomId of roomIds) {
          nextRooms.add(roomId);
          matchByRoomRef.current.set(roomId, match);

          if (socketsRef.current.has(roomId)) continue;

          const ws = new WebSocket(chatWsUrl(roomId));
          ws.onmessage = (event) => {
            let data: unknown;
            try {
              data = JSON.parse(event.data);
            } catch {
              return;
            }

            const parsed = parseWsChatMessage(data);
            if (!parsed) return;

            const matched = matchByRoomRef.current.get(roomId);
            if (!matched) return;

            if (isViewingMatchChat(pathnameRef.current, matched)) return;

            deliverIncomingChatMessage(
              chatRoomKey(matched),
              parsed,
              {
                userId: matched.user_id,
                name: matched.name,
                photo: matched.profile_photo,
              },
              {
                notify: true,
                onMessagesPage: pathnameRef.current === "/messages",
              }
            );
          };

          socketsRef.current.set(roomId, ws);
        }
      }

      for (const [roomId, ws] of Array.from(socketsRef.current.entries())) {
        if (!nextRooms.has(roomId)) {
          ws.close();
          socketsRef.current.delete(roomId);
          matchByRoomRef.current.delete(roomId);
        }
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void syncListeners();

    const onFocus = () => void syncListeners();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncListeners();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => void syncListeners(), 60_000);

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      socketsRef.current.forEach((ws) => ws.close());
      socketsRef.current.clear();
      matchByRoomRef.current.clear();
    };
  }, [syncListeners]);

  return null;
}
