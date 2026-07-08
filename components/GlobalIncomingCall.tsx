"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import IncomingCallOverlay from "@/components/IncomingCallOverlay";
import { markCallAccepted, stashPendingCallOffer } from "@/lib/incomingCall";
import {
  buildVideoCallHref,
  callRoomIdsForMatch,
  callWsUrl,
  getMatchedList,
  isLoggedIn,
  parseProfileCards,
  stashChatPeer,
  type ProfileCard,
} from "@/lib/letsmeet";

interface ActiveIncomingCall {
  roomId: string;
  match: ProfileCard;
}

function vibrateIncoming() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([180, 120, 180]);
  }
}

export default function GlobalIncomingCall() {
  const router = useRouter();
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<ActiveIncomingCall | null>(null);
  const socketsRef = useRef<Map<string, WebSocket>>(new Map());
  const matchByRoomRef = useRef<Map<string, ProfileCard>>(new Map());
  const incomingRef = useRef<ActiveIncomingCall | null>(null);
  incomingRef.current = incoming;

  const handleRing = useCallback((roomId: string, offer?: RTCSessionDescriptionInit) => {
    if (offer) stashPendingCallOffer(roomId, offer);

    const match = matchByRoomRef.current.get(roomId);
    if (!match) return;

    if (pathname.startsWith(`/video-call/${roomId}`)) return;

    const current = incomingRef.current;
    if (current?.roomId === roomId) return;

    setIncoming({ roomId, match });
    vibrateIncoming();
  }, [pathname]);

  const syncListeners = useCallback(async () => {
    if (!isLoggedIn()) {
      socketsRef.current.forEach((ws) => ws.close());
      socketsRef.current.clear();
      matchByRoomRef.current.clear();
      setIncoming(null);
      return;
    }

    const res = await getMatchedList();
    if (!res.ok) return;

    const matches = parseProfileCards(res.data);
    const nextRooms = new Set<string>();

    for (const match of matches) {
      const roomIds = callRoomIdsForMatch(match);
      for (const roomId of roomIds) {
        nextRooms.add(roomId);
        matchByRoomRef.current.set(roomId, match);

        if (socketsRef.current.has(roomId)) continue;

        const ws = new WebSocket(callWsUrl(roomId));
        ws.onmessage = (event) => {
          let data: { type?: string; offer?: RTCSessionDescriptionInit };
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          if (data.type === "ring") {
            handleRing(roomId);
          } else if (data.type === "offer" && data.offer) {
            handleRing(roomId, data.offer);
          }
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
  }, [handleRing]);

  useEffect(() => {
    void syncListeners();

    const onFocus = () => void syncListeners();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncListeners();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => void syncListeners(), 45000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      const sockets = socketsRef.current;
      sockets.forEach((ws) => ws.close());
      sockets.clear();
      matchByRoomRef.current.clear();
    };
  }, [syncListeners, pathname]);

  const decline = useCallback(() => {
    if (!incoming) return;
    const ws = socketsRef.current.get(incoming.roomId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "reject" }));
    }
    setIncoming(null);
  }, [incoming]);

  const accept = useCallback(() => {
    if (!incoming) return;
    stashChatPeer(incoming.match);
    markCallAccepted(incoming.roomId);
    const href = `${buildVideoCallHref(incoming.roomId)}?accept=1`;
    setIncoming(null);
    router.push(href);
  }, [incoming, router]);

  if (!incoming) return null;

  return (
    <IncomingCallOverlay
      name={incoming.match.name}
      photo={incoming.match.profile_photo}
      onAccept={accept}
      onDecline={decline}
    />
  );
}
