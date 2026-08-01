"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  sendMessage,
  extractError,
  getChatPhoto,
  getSingleProfile,
  getMessageList,
  parseApiChatMessages,
  isOwnSenderId,
  normalizeMediaInput,
  prefetchMedia,
  loadChatMessages,
  mergeChatMessages,
  saveChatMessages,
  linkMatchRoomIds,
  stashChatRoomId,
  readChatPeer,
  peerMatchesRoom,
  findMatchByRoomId,
  buildVideoCallHref,
  buildAudioCallHref,
  resolveNumericRoomId,
  type StoredChatMessage,
} from "@/lib/letsmeet";
import { useChatSocket, type WsIncomingMessage } from "@/lib/useChatSocket";
import {
  formatDateSeparator,
  markRoomRead,
  syncInboxFromMessages,
  bumpOutgoing,
  upsertInboxPeer,
} from "@/lib/chatInbox";
import ChatComposer from "@/components/ChatComposer";
import Avatar from "@/components/Avatar";

type ChatMessage = StoredChatMessage;

const COMPOSER_OFFSET =
  "calc(var(--composer-h) + env(safe-area-inset-bottom, 0px) + 0.75rem)";

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom(el: HTMLElement | null, smooth = true) {
  if (!el) return;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
}

interface ChatRoomProps {
  roomId: number | string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const [name, setName] = useState("Chat");
  const [userId, setUserId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [peerLoading, setPeerLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef<string>("");

  const storageKey = String(roomId);

  const peerMeta = useCallback(
    () => ({ userId, name, photo }),
    [userId, name, photo]
  );

  const scrollBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => scrollToBottom(bottomRef.current, smooth));
  }, []);

  useEffect(() => {
    markRoomRead(roomId);
    upsertInboxPeer(roomId, peerMeta());

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        markRoomRead(roomId);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [roomId, peerMeta]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const peer = readChatPeer();
      if (peer && peerMatchesRoom(peer, roomId)) {
        if (!cancelled) {
          setName(peer.name || "Chat");
          setUserId(peer.userId);
          const img = peer.photo ?? getChatPhoto(roomId, peer.userId);
          setPhoto(img);
          if (img) prefetchMedia([img], 1);
          upsertInboxPeer(roomId, {
            userId: peer.userId,
            name: peer.name,
            photo: img,
          });
        }
      }

      const match = await findMatchByRoomId(roomId);
      if (cancelled) return;

      if (match) {
        setName(match.name);
        setUserId(match.user_id);
        const img = normalizeMediaInput(match.profile_photo);
        if (img) {
          setPhoto(img);
          prefetchMedia([img], 1);
        }
        upsertInboxPeer(roomId, {
          userId: match.user_id,
          name: match.name,
          photo: img,
        });
        const resolved = resolveNumericRoomId(match);
        if (resolved != null) {
          // Only alias room-scoped identifiers — `match.id` is a generic
          // match/like-system id and can collide with an unrelated match's
          // numeric room id, corrupting room resolution app-wide.
          linkMatchRoomIds(resolved, [match.chatroom_id, roomId]);
        }
      }

      setPeerLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const res = await getSingleProfile(userId);
      if (cancelled) return;
      if (res.ok && res.data?.profile) {
        setName((prev) => res.data!.profile.name || prev);
        const img = normalizeMediaInput(res.data.profile.profile_image);
        if (img) {
          setPhoto(img);
          prefetchMedia([img], 1);
        }
        upsertInboxPeer(roomId, {
          userId,
          name: res.data.profile.name,
          photo: img,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, roomId]);

  // Reset messages the instant the room changes so a previous conversation's
  // messages can never linger on screen while the new room's data loads.
  useEffect(() => {
    setMessages([]);
    setHistoryLoading(true);
  }, [roomId]);

  useEffect(() => {
    const local = loadChatMessages(storageKey);
    if (local.length > 0) {
      setMessages(local);
      syncInboxFromMessages(roomId, local, peerMeta());
      scrollBottom(false);
    }

    let cancelled = false;
    (async () => {
      const res = await getMessageList(roomId);
      if (cancelled) return;
      setHistoryLoading(false);

      if (!res.ok) return;

      if (res.data && typeof res.data === "object") {
        const rawObj = res.data as Record<string, unknown>;
        const items = rawObj.items;
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0] as Record<string, unknown> | undefined;
          const dbRoomId = Number(first?.room_id ?? first?.room);
          if (Number.isFinite(dbRoomId) && dbRoomId > 0) {
            stashChatRoomId(String(roomId), dbRoomId);
            linkMatchRoomIds(dbRoomId, [roomId]);
          }
        }
      }

      const fromApi = parseApiChatMessages(res.data);
      const merged = mergeChatMessages(local, fromApi);
      if (merged.length === 0) return;

      setMessages(merged);
      saveChatMessages(storageKey, merged);
      syncInboxFromMessages(roomId, merged, peerMeta());
      markRoomRead(roomId);
      scrollBottom(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey, roomId, peerMeta, scrollBottom]);

  useEffect(() => {
    if (messages.length === 0) return;
    saveChatMessages(storageKey, messages);
    syncInboxFromMessages(roomId, messages, peerMeta());
  }, [storageKey, roomId, messages, peerMeta]);

  const onIncoming = useCallback(
    (msg: WsIncomingMessage) => {
      if (isOwnSenderId(msg.senderId)) return;
      if (!msg.senderId && msg.text === lastSentRef.current) return;

      setMessages((prev) => {
        if (msg.messageId && prev.some((m) => m.id === msg.messageId)) {
          return prev;
        }

        const recentMine = prev.some(
          (m) => m.from === "me" && m.text === msg.text && Date.now() - m.at < 15000
        );
        if (recentMine) return prev;

        const next = [
          ...prev,
          {
            id: msg.messageId ?? Date.now() + Math.random(),
            from: "them" as const,
            text: msg.text,
            time: nowTime(),
            at: Date.now(),
            isRead: false,
          },
        ];
        syncInboxFromMessages(roomId, next, peerMeta());
        markRoomRead(roomId);
        return next;
      });
      scrollBottom();
    },
    [roomId, peerMeta, scrollBottom]
  );

  const { connected } = useChatSocket(roomId, onIncoming);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setError("");

    const optimistic: ChatMessage = {
      id: Date.now(),
      from: "me",
      text,
      time: nowTime(),
      at: Date.now(),
      isRead: true,
    };
    setMessages((prev) => {
      const next = [...prev, optimistic];
      bumpOutgoing(roomId, text, optimistic.at, peerMeta());
      syncInboxFromMessages(roomId, next, peerMeta());
      saveChatMessages(storageKey, next);
      return next;
    });
    setInput("");
    lastSentRef.current = text;
    scrollBottom();

    setSending(true);
    try {
      const res = await sendMessage(text, roomId);
      if (!res.ok || res.data?.error) {
        setError(extractError(res.data, "Message failed to save."));
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return;
      }

      if (res.data?.message_id != null) {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === optimistic.id ? { ...m, id: res.data!.message_id! } : m
          );
          saveChatMessages(storageKey, next);
          syncInboxFromMessages(roomId, next, peerMeta());
          return next;
        });
      }
    } catch {
      setError("Network error. Message not sent.");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  const showDateSeparator = (index: number) => {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].at).toDateString();
    const curr = new Date(messages[index].at).toDateString();
    return prev !== curr;
  };

  return (
    <div className="mobile-shell flex flex-col min-h-dvh bg-[#FAFAFA]">
      <header className="app-header flex items-center gap-2.5">
        <Link
          href="/messages"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-border transition-colors flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="#12151C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <Avatar photo={photo} name={name} size="sm" priority />

        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-dark leading-tight truncate">
            {peerLoading ? "Loading…" : name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? "bg-green-500" : "bg-amber-400"}`}
            />
            <p className="text-xs font-medium text-muted truncate">
              {connected ? "Live" : "Connecting…"}
            </p>
          </div>
        </div>

        <Link
          href={buildAudioCallHref(roomId)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary-light hover:bg-primary/20 transition-colors flex-shrink-0"
          title="Audio call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72 12.1 12.1 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.1 12.1 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"
              stroke="#F759F5"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <Link
          href={buildVideoCallHref(roomId)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary-light hover:bg-primary/20 transition-colors flex-shrink-0"
          title="Video call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polygon points="23 7 16 12 23 17 23 7" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
            <rect x="1" y="5" width="15" height="14" rx="2" stroke="#F759F5" strokeWidth="2" />
          </svg>
        </Link>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-border transition-colors"
            aria-label="More options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="#12151C" />
              <circle cx="12" cy="12" r="1.5" fill="#12151C" />
              <circle cx="12" cy="19" r="1.5" fill="#12151C" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 bg-white rounded-2xl shadow-card border border-border overflow-hidden min-w-[180px]">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    saveChatMessages(storageKey, []);
                    syncInboxFromMessages(roomId, [], peerMeta());
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Clear chat
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 pt-header space-y-3"
        style={{ paddingBottom: COMPOSER_OFFSET }}
      >
        {historyLoading && messages.length === 0 && (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                <div className="h-12 rounded-2xl bg-border animate-pulse w-2/3 max-w-[240px]" />
              </div>
            ))}
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="text-center text-sm text-muted mt-16 px-6">
            <p className="font-semibold text-dark mb-1">Say hi to {name}!</p>
            <p>Start the conversation with a friendly message.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id}>
            {showDateSeparator(index) && (
              <div className="flex justify-center my-4">
                <span className="text-xs font-medium text-muted bg-white/80 px-3 py-1 rounded-full shadow-sm">
                  {formatDateSeparator(msg.at)}
                </span>
              </div>
            )}
            <div
              className={`flex items-end gap-2 ${msg.from === "me" ? "justify-end" : "justify-start"}`}
            >
              {msg.from === "them" && (
                <Avatar photo={photo} name={name} size="sm" className="!w-8 !h-8 text-[10px] mb-1" />
              )}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-[15px] leading-6 scroll-mb-24 ${
                  msg.from === "me"
                    ? "bg-primary text-white rounded-br-md shadow-sm"
                    : "bg-white text-dark rounded-bl-md shadow-card border border-border/50"
                }`}
              >
                <p className="break-words">{msg.text}</p>
                <p
                  className={`text-[11px] mt-1 ${msg.from === "me" ? "text-white/70" : "text-muted"}`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-1 scroll-mb-24" />
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={() => void handleSend()}
        sending={sending}
        error={error}
        onFocus={() => scrollBottom()}
      />
    </div>
  );
}
