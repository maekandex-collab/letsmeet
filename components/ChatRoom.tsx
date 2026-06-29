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
  getNumericUserId,
  normalizeMediaInput,
  prefetchMedia,
  loadChatMessages,
  saveChatMessages,
  linkMatchRoomIds,
  stashChatRoomId,
  readChatPeer,
  findMatchByRoomId,
  buildVideoCallHref,
  resolveNumericRoomId,
  type StoredChatMessage,
} from "@/lib/letsmeet";
import { useChatSocket, type WsIncomingMessage } from "@/lib/useChatSocket";
import Avatar from "@/components/Avatar";

type ChatMessage = StoredChatMessage;

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef<string>("");

  const storageKey = String(roomId);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const peer = readChatPeer();
      if (peer?.roomId === roomId || peer?.userId) {
        if (!cancelled) {
          setName(peer.name || "Chat");
          setUserId(peer.userId);
          const img =
            peer.photo ??
            getChatPhoto(roomId, peer.userId);
          setPhoto(img);
          if (img) prefetchMedia([img], 1);
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
        const resolved = resolveNumericRoomId(match);
        if (resolved != null) {
          linkMatchRoomIds(resolved, [match.chatroom_id, roomId, match.id]);
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
        setName(res.data.profile.name || name);
        const img = normalizeMediaInput(res.data.profile.profile_image);
        if (img) {
          setPhoto(img);
          prefetchMedia([img], 1);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const local = loadChatMessages(storageKey);
    setMessages(local);

    let cancelled = false;
    (async () => {
      const res = await getMessageList(roomId);
      if (cancelled || !res.ok) return;

      if (res.data && typeof res.data === "object") {
        const rawObj = res.data as Record<string, unknown>;
        const items = rawObj.items;
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0] as Record<string, unknown> | undefined;
          const dbRoomId = Number(first?.room_id ?? first?.room);
          if (Number.isFinite(dbRoomId) && dbRoomId > 0) {
            stashChatRoomId(String(roomId), dbRoomId);
          }
        }
      }

      const fromApi = parseApiChatMessages(res.data, getNumericUserId());
      if (fromApi.length === 0) return;

      setMessages(fromApi);
      saveChatMessages(storageKey, fromApi);
    })();

    return () => {
      cancelled = true;
    };
  }, [storageKey, roomId]);

  useEffect(() => {
    if (messages.length === 0) return;
    saveChatMessages(storageKey, messages);
  }, [storageKey, messages]);

  const onIncoming = useCallback((msg: WsIncomingMessage) => {
    const myNumericId = getNumericUserId();
    const isMe = msg.senderId != null && myNumericId != null && String(msg.senderId) === String(myNumericId);

    if (isMe) {
      // Ignore our own WebSocket echoes as they are already optimistically rendered
      return;
    }

    if (!msg.senderId && msg.text === lastSentRef.current) {
      return;
    }

    setMessages((prev) => {
      if (msg.messageId && prev.some((m) => m.id === msg.messageId)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: msg.messageId ?? (Date.now() + Math.random()),
          from: "them",
          text: msg.text,
          time: nowTime(),
          at: Date.now(),
        },
      ];
    });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const { connected, send: sendWs } = useChatSocket(roomId, onIncoming);

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
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    lastSentRef.current = text;
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    setSending(true);
    try {
      if (connected) {
        sendWs(text);
      }

      const res = await sendMessage(text, roomId);
      if (!res.ok || res.data?.error) {
        setError(extractError(res.data, "Message failed to save."));
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return;
      }

      if (res.data?.room_id != null && res.data.room_id !== roomId) {
        linkMatchRoomIds(res.data.room_id, [roomId, userId, readChatPeer()?.chatroomId]);
      }
    } catch {
      setError("Network error. Message not sent.");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mobile-shell flex flex-col h-screen">
      <div className="app-header flex items-center gap-3 px-4">
        <Link
          href="/messages"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-border transition-colors"
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
          <p className="text-xs font-medium text-muted">
            {connected ? "Live chat" : "Matched · connecting…"}
          </p>
        </div>

        <Link
          href={buildVideoCallHref(roomId)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary-light hover:bg-primary/20 transition-colors"
          title="Video call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polygon points="23 7 16 12 23 17 23 7" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
            <rect x="1" y="5" width="15" height="14" rx="2" stroke="#F759F5" strokeWidth="2" />
          </svg>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-border transition-colors"
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
                <Link
                  href={buildVideoCallHref(roomId)}
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-dark hover:bg-border/40 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                    <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Video call
                </Link>
                <button
                  onClick={() => {
                    setMessages([]);
                    saveChatMessages(storageKey, []);
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-20 pb-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted mt-10">
            Say hi to {name}! 👋
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-5 ${
                msg.from === "me"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-border text-dark rounded-bl-md"
              }`}
            >
              <p>{msg.text}</p>
              <p
                className={`text-xs mt-1 ${msg.from === "me" ? "text-white/70" : "text-muted"}`}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-500">{error}</p>}

      <div className="px-4 py-3 bg-white border-t border-border flex items-center gap-2 pb-safe">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 h-11 px-4 rounded-2xl bg-border text-sm text-dark placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
