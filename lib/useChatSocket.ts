"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatWsUrl } from "@/lib/letsmeet";
import { parseWsChatMessage, type WsIncomingMessage } from "@/lib/chatWs";

export type { WsIncomingMessage };

export function useChatSocket(
  roomId: string | number | null,
  onIncoming: (msg: WsIncomingMessage) => void,
  onTyping?: (typing: boolean) => void
) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;
  const onTypingRef = useRef(onTyping);
  onTypingRef.current = onTyping;

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
        if (data && typeof data === "object") {
          const frame = data as Record<string, unknown>;
          const type = String(frame.type ?? frame.event ?? "").toLowerCase();
          if (type === "typing" || "is_typing" in frame) {
            onTypingRef.current?.(frame.is_typing !== false && frame.typing !== false);
            return;
          }
        }
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

  const sendTyping = useCallback((typing: boolean) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: "typing", is_typing: typing }));
    return true;
  }, []);

  return { connected, send, sendTyping };
}
