"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { callWsUrl } from "@/lib/letsmeet";
import { stashPendingCallOffer } from "@/lib/incomingCall";

export function useIncomingCall(roomId: string | number | null) {
  const [incoming, setIncoming] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const id =
      roomId == null
        ? null
        : typeof roomId === "number"
          ? roomId
          : String(roomId).trim();
    if (id == null || id === "") return;

    const ws = new WebSocket(callWsUrl(id));
    socketRef.current = ws;

    ws.onmessage = (event) => {
      let data: { type?: string; offer?: RTCSessionDescriptionInit };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "ring" || (data.type === "offer" && data.offer)) {
        if (data.type === "offer" && data.offer) {
          stashPendingCallOffer(id, data.offer);
        }
        setIncoming(true);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([180, 120, 180]);
        }
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [roomId]);

  const decline = useCallback(() => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "reject" }));
    }
    setIncoming(false);
  }, []);

  const dismiss = useCallback(() => {
    setIncoming(false);
  }, []);

  return { incoming, decline, dismiss };
}
