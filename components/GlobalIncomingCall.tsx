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
  audioOnly?: boolean;
}

function vibrateIncoming() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([180, 120, 180]);
  }
}

export default function GlobalIncomingCall() {
  const router = useRouter();
  const pathname = usePathname();
  // Kept in a ref (rather than a `handleRing` dependency) so the ring/offer
  // WebSocket handlers — assigned once per socket — always see the current
  // route without forcing the whole listener-sync effect to tear down and
  // recreate every socket on each navigation.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [incoming, setIncoming] = useState<ActiveIncomingCall | null>(null);
  const socketsRef = useRef<Map<string, WebSocket>>(new Map());
  const matchByRoomRef = useRef<Map<string, ProfileCard>>(new Map());
  const incomingRef = useRef<ActiveIncomingCall | null>(null);
  incomingRef.current = incoming;

  const handleRing = useCallback((roomId: string, offer?: RTCSessionDescriptionInit, audioOnly?: boolean) => {
    if (offer) stashPendingCallOffer(roomId, offer);

    const match = matchByRoomRef.current.get(roomId);
    if (!match) return;

    if (pathnameRef.current.startsWith(`/video-call/${roomId}`)) return;

    const current = incomingRef.current;
    if (current?.roomId === roomId) return;

    setIncoming({ roomId, match, audioOnly });
    vibrateIncoming();
  }, []);

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
          let data: { type?: string; offer?: RTCSessionDescriptionInit; audioOnly?: boolean };
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          if (data.type === "ring") {
            handleRing(roomId, undefined, data.audioOnly);
          } else if (data.type === "offer" && data.offer) {
            handleRing(roomId, data.offer, data.audioOnly);
          } else if (data.type === "hangup") {
            if (incomingRef.current?.roomId === roomId) {
              setIncoming(null);
            }
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

  // Intentionally independent of `pathname`: incoming-call sockets must stay
  // open while navigating between chat/messages/etc. Tearing them down on
  // every route change (as before) created a window right after navigation
  // where an incoming ring/offer could be missed entirely.
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
  }, [syncListeners]);

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
    const audioParam = incoming.audioOnly ? "&audio=1" : "";
    const href = `${buildVideoCallHref(incoming.roomId)}?accept=1${audioParam}`;
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
      audioOnly={incoming.audioOnly}
    />
  );
}
