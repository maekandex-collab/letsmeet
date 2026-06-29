"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatWsUrl } from "@/lib/letsmeet";

export interface WsIncomingMessage {
  text: string;
  senderId?: number | string;
  messageId?: number;
}

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
        let text = "";
        let senderId: number | string | undefined;
        let messageId: number | undefined;

        if (data.payload) {
          text = data.payload.text || data.payload.message || "";
          senderId = data.payload.sender_id || data.payload.user_id;
          messageId = data.payload.message_id || data.payload.id;
        } else if (data.message) {
          text = typeof data.message === "string" ? data.message : (data.message.text || "");
          senderId = data.message.sender_id || data.sender_id;
          messageId = data.message.message_id || data.message_id;
        } else if (data.text) {
          text = data.text;
          senderId = data.sender_id;
          messageId = data.message_id;
        }

        if (text && text.trim()) {
          onIncomingRef.current({
            text: text.trim(),
            senderId,
            messageId,
          });
        }
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
