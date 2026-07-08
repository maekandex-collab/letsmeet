import type { StoredChatMessage } from "@/lib/letsmeet";

export interface ChatInboxEntry {
  roomId: string;
  peerUserId: string;
  peerName: string;
  peerPhoto: string | null;
  lastText: string;
  lastAt: number;
  unreadCount: number;
  lastReadAt: number;
}

const INBOX_KEY = "lm_chat_inbox";

function roomKey(roomId: string | number): string {
  return String(roomId).trim();
}

function loadInboxMap(): Record<string, ChatInboxEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ChatInboxEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveInboxMap(map: Record<string, ChatInboxEntry>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("lm-inbox-change"));
  } catch {
    // quota exceeded
  }
}

export function getInboxEntry(roomId: string | number): ChatInboxEntry | null {
  const map = loadInboxMap();
  return map[roomKey(roomId)] ?? null;
}

export function getAllInboxEntries(): ChatInboxEntry[] {
  return Object.values(loadInboxMap());
}

export function getTotalUnreadCount(): number {
  return getAllInboxEntries().reduce((sum, e) => sum + e.unreadCount, 0);
}

function countUnread(messages: StoredChatMessage[], lastReadAt: number): number {
  return messages.filter(
    (m) =>
      m.from === "them" &&
      m.at > lastReadAt &&
      (m.isRead === undefined || m.isRead === false)
  ).length;
}

export function syncInboxFromMessages(
  roomId: string | number,
  messages: StoredChatMessage[],
  peer?: { userId?: string | null; name?: string; photo?: string | null }
): ChatInboxEntry {
  const key = roomKey(roomId);
  const map = loadInboxMap();
  const existing = map[key];
  const lastReadAt = existing?.lastReadAt ?? 0;

  const sorted = [...messages].sort((a, b) => a.at - b.at);
  const last = sorted[sorted.length - 1];

  const entry: ChatInboxEntry = {
    roomId: key,
    peerUserId: peer?.userId ?? existing?.peerUserId ?? "",
    peerName: peer?.name ?? existing?.peerName ?? "Chat",
    peerPhoto: peer?.photo ?? existing?.peerPhoto ?? null,
    lastText: last?.text ?? existing?.lastText ?? "",
    lastAt: last?.at ?? existing?.lastAt ?? 0,
    lastReadAt,
    unreadCount: countUnread(sorted, lastReadAt),
  };

  map[key] = entry;
  saveInboxMap(map);
  return entry;
}

export function upsertInboxPeer(
  roomId: string | number,
  peer: { userId?: string | null; name?: string; photo?: string | null }
): void {
  const key = roomKey(roomId);
  const map = loadInboxMap();
  const existing = map[key] ?? {
    roomId: key,
    peerUserId: "",
    peerName: "Chat",
    peerPhoto: null,
    lastText: "",
    lastAt: 0,
    unreadCount: 0,
    lastReadAt: 0,
  };

  map[key] = {
    ...existing,
    peerUserId: peer.userId ?? existing.peerUserId,
    peerName: peer.name ?? existing.peerName,
    peerPhoto: peer.photo ?? existing.peerPhoto,
  };
  saveInboxMap(map);
}

export function bumpIncoming(
  roomId: string | number,
  text: string,
  at: number,
  peer?: { userId?: string | null; name?: string; photo?: string | null }
): ChatInboxEntry {
  const key = roomKey(roomId);
  const map = loadInboxMap();
  const existing = map[key] ?? {
    roomId: key,
    peerUserId: peer?.userId ?? "",
    peerName: peer?.name ?? "Chat",
    peerPhoto: peer?.photo ?? null,
    lastText: "",
    lastAt: 0,
    unreadCount: 0,
    lastReadAt: 0,
  };

  const entry: ChatInboxEntry = {
    ...existing,
    peerUserId: peer?.userId ?? existing.peerUserId,
    peerName: peer?.name ?? existing.peerName,
    peerPhoto: peer?.photo ?? existing.peerPhoto,
    lastText: text,
    lastAt: at,
    unreadCount: at > existing.lastReadAt ? existing.unreadCount + 1 : existing.unreadCount,
  };

  map[key] = entry;
  saveInboxMap(map);
  return entry;
}

export function markRoomRead(roomId: string | number): void {
  const key = roomKey(roomId);
  const map = loadInboxMap();
  const existing = map[key];
  if (!existing) return;

  map[key] = {
    ...existing,
    lastReadAt: Date.now(),
    unreadCount: 0,
  };
  saveInboxMap(map);
}

export function formatRelativeTime(at: number): string {
  if (!at) return "";
  const now = Date.now();
  const diff = now - at;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;

  const date = new Date(at);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatDateSeparator(at: number): string {
  const date = new Date(at);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export async function hydrateInboxFromApi(
  roomIds: (string | number)[],
  fetchMessages: (roomId: string | number) => Promise<StoredChatMessage[]>,
  concurrency = 3
): Promise<void> {
  const queue = [...roomIds];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const roomId = queue.shift();
      if (roomId == null) break;
      try {
        const messages = await fetchMessages(roomId);
        if (messages.length > 0) {
          syncInboxFromMessages(roomId, messages);
        }
      } catch {
        // skip failed room
      }
    }
  });
  await Promise.all(workers);
}
