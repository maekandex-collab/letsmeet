"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatWsUrl } from "@/lib/letsmeet";
import { parseWsChatMessage, type WsIncomingMessage } from "@/lib/chatWs";

export type { WsIncomingMessage };

export function useChatSocket(
  roomId: string | number | null,
  onIncoming: (msg: WsIncomingMessage) => void
) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;

  useEffect(() => {
    if (roomId == null || Number.isNaN(roomId)) return;

    const ws = new WebSocket(chatWsUrl(roomId));
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parsed = parseWsChatMessage(data);
        if (parsed) onIncomingRef.current(parsed);
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((message: string) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ message }));
    return true;
  }, []);

  return { connected, send };
}
