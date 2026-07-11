export interface WsIncomingMessage {
  text: string;
  senderId?: number | string;
  messageId?: number;
}

/** Parse a chat WebSocket frame from the LetsMeet backend. */
export function parseWsChatMessage(data: unknown): WsIncomingMessage | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;
  let text = "";
  let senderId: number | string | undefined;
  let messageId: number | undefined;

  const payload = raw.payload;
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    text = String(p.text ?? p.message ?? "");
    senderId = (p.sender_id ?? p.user_id) as number | string | undefined;
    messageId = (p.message_id ?? p.id) as number | undefined;
  } else if (raw.message) {
    if (typeof raw.message === "string") {
      text = raw.message;
    } else if (typeof raw.message === "object") {
      const m = raw.message as Record<string, unknown>;
      text = String(m.text ?? m.message ?? "");
      senderId = (m.sender_id ?? raw.sender_id) as number | string | undefined;
      messageId = (m.message_id ?? raw.message_id) as number | undefined;
    }
  } else if (typeof raw.text === "string") {
    text = raw.text;
    senderId = raw.sender_id as number | string | undefined;
    messageId = raw.message_id as number | undefined;
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  return { text: trimmed, senderId, messageId };
}
