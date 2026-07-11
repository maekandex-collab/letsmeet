import { bumpIncoming } from "@/lib/chatInbox";
import type { WsIncomingMessage } from "@/lib/chatWs";
import {
  isOwnSenderId,
  loadChatMessages,
  mergeChatMessages,
  saveChatMessages,
  type StoredChatMessage,
} from "@/lib/letsmeet";

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Merge one incoming message into local chat history (all storage aliases). */
export function appendIncomingChatMessage(
  storageRoomId: string | number,
  msg: WsIncomingMessage
): StoredChatMessage | null {
  if (isOwnSenderId(msg.senderId)) return null;

  const existing = loadChatMessages(storageRoomId);
  if (msg.messageId && existing.some((m) => m.id === msg.messageId)) {
    return null;
  }

  const at = Date.now();
  const recentDup = existing.some(
    (m) => m.from === "them" && m.text === msg.text && at - m.at < 8000
  );
  if (recentDup) return null;

  const entry: StoredChatMessage = {
    id: msg.messageId ?? at,
    from: "them",
    text: msg.text,
    time: nowTimeLabel(),
    at,
    isRead: false,
  };

  saveChatMessages(storageRoomId, mergeChatMessages(existing, [entry]));
  return entry;
}

export function notifyIncomingChat(
  peerName: string,
  text: string,
  onMessagesPage: boolean
): void {
  if (typeof window === "undefined" || onMessagesPage) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const body = text.length > 120 ? `${text.slice(0, 117)}…` : text;
    new Notification(peerName ? `New message from ${peerName}` : "New message", {
      body,
      tag: `lm-chat-${peerName}`,
    });
  } catch {
    // ignore notification errors
  }
}

export function deliverIncomingChatMessage(
  storageRoomId: string | number,
  msg: WsIncomingMessage,
  peer?: { userId?: string | null; name?: string; photo?: string | null },
  options?: { notify?: boolean; onMessagesPage?: boolean }
): boolean {
  const entry = appendIncomingChatMessage(storageRoomId, msg);
  if (!entry) return false;

  bumpIncoming(storageRoomId, entry.text, entry.at, peer);

  if (options?.notify) {
    notifyIncomingChat(peer?.name ?? "Chat", entry.text, options.onMessagesPage ?? false);
  }

  return true;
}
