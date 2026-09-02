"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  sendMessage,
  extractError,
  getChatPhoto,
  getSingleProfile,
  fetchMessageHistory,
  isOwnSenderId,
  rememberOwnSenderId,
  normalizeMediaInput,
  prefetchMedia,
  loadChatMessages,
  mergeChatMessages,
  saveChatMessages,
  linkMatchRoomIds,
  readChatPeer,
  peerMatchesRoom,
  findMatchByRoomId,
  buildVideoCallHref,
  buildAudioCallHref,
  resolveNumericRoomId,
  resolveMessageRoomId,
  unmatchUser,
  matchIdForUnmatch,
  type StoredChatMessage,
} from "@/lib/letsmeet";
import { useChatSocket, type WsIncomingMessage } from "@/lib/useChatSocket";
import {
  formatDateSeparator,
  markRoomRead,
  syncInboxFromMessages,
  bumpOutgoing,
  upsertInboxPeer,
  removeInboxRoom,
} from "@/lib/chatInbox";
import ChatComposer from "@/components/ChatComposer";
import Avatar from "@/components/Avatar";
import GameChallengeCard from "@/components/GameChallengeCard";
import { useVisualViewport } from "@/lib/useVisualViewport";
import { GAMES, type GameSlug } from "@/lib/games";
import {
  createChallengeId,
  encodeChallenge,
  parseGameChallenge,
} from "@/lib/gameChallenge";

type ChatMessage = StoredChatMessage;

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom(el: HTMLElement | null, smooth = true) {
  if (!el) return;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
}

function MessageTicks({ message }: { message: ChatMessage }) {
  if (message.from !== "me") return null;
  if (message.delivery === "sending") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-label="Sending">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (message.delivery === "failed") {
    return <span className="font-bold text-red-200" aria-label="Failed to send">!</span>;
  }
  return (
    <svg width="13" height="11" viewBox="0 0 14 12" fill="none" className="text-white/70" aria-label="Sent">
      <path d="M1.2 6 4.6 9.3 12.4 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ChatRoomProps {
  roomId: number | string;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const router = useRouter();
  const [name, setName] = useState("Chat");
  const [userId, setUserId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerLoading, setPeerLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [socketRoomId, setSocketRoomId] = useState<string | number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef<string>("");
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { keyboardOpen, height: viewportHeight, offsetTop, keyboardInset } = useVisualViewport();

  const storageKey = String(roomId);

  const peerMeta = useCallback(
    () => ({ userId, name, photo }),
    [userId, name, photo]
  );

  const scrollBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      scrollToBottom(bottomRef.current, smooth);
      const list = listRef.current;
      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    if (keyboardOpen) scrollBottom(false);
  }, [keyboardOpen, scrollBottom]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    markRoomRead(roomId);
    upsertInboxPeer(roomId, peerMeta());
  }, [roomId, peerMeta]);

  const loadHistory = useCallback(
    async (cancelled: () => boolean) => {
      const local = loadChatMessages(storageKey);
      if (local.length > 0 && !cancelled()) {
        setMessages(local);
        syncInboxFromMessages(roomId, local, peerMeta());
        scrollBottom(false);
      }

      const res = await fetchMessageHistory(roomId, {
        peerUserId: userId,
        localHint: local,
      });
      if (cancelled()) return;
      setHistoryLoading(false);
      if (!res.ok || !res.data) return;

      const fromApi = res.data;
      const merged = mergeChatMessages(local, fromApi);
      if (merged.length === 0) return;

      setMessages(merged);
      saveChatMessages(storageKey, merged);
      syncInboxFromMessages(roomId, merged, peerMeta());
      markRoomRead(roomId);
      scrollBottom(false);
    },
    [storageKey, roomId, userId, peerMeta, scrollBottom]
  );

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    void loadHistory(isCancelled);
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      markRoomRead(roomId);
      void loadHistory(() => false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [roomId, loadHistory]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const peer = readChatPeer();
      if (peer && peerMatchesRoom(peer, roomId)) {
        if (!cancelled) {
          setName(peer.name || "Chat");
          setUserId(peer.userId);
          if (peer.matchId) setMatchId(peer.matchId);
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
        const resolvedMatchId = matchIdForUnmatch(match);
        if (resolvedMatchId) setMatchId(resolvedMatchId);
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
    let cancelled = false;
    (async () => {
      const resolved = await resolveMessageRoomId(roomId);
      if (cancelled) return;
      if (resolved) {
        setSocketRoomId(resolved);
        if (resolved !== String(roomId) && /^\d{1,7}$/.test(String(roomId))) {
          router.replace(`/chat/${resolved}`);
        }
      } else {
        setSocketRoomId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, router]);

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

  const onPeerTyping = useCallback((typing: boolean) => {
    setPeerTyping(typing);
    if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
    if (typing) {
      peerTypingTimerRef.current = setTimeout(() => setPeerTyping(false), 3500);
    }
  }, []);

  const { connected, sendTyping } = useChatSocket(socketRoomId, onIncoming, onPeerTyping);

  useEffect(() => {
    if (connected) return;
    const timer = setInterval(() => {
      void loadHistory(() => false);
    }, 8000);
    return () => clearInterval(timer);
  }, [connected, loadHistory]);

  useEffect(() => {
    if (!connected) return;
    const typing = input.trim().length > 0;
    sendTyping(typing);
    if (!typing) return;
    const timer = setTimeout(() => sendTyping(false), 1800);
    return () => clearTimeout(timer);
  }, [input, connected, sendTyping]);

  useEffect(() => () => {
    if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
  }, []);

  async function handleUnmatch() {
    setMenuOpen(false);
    if (unmatching) return;

    let id = matchId;
    if (!id) {
      const match = await findMatchByRoomId(roomId);
      id = match ? matchIdForUnmatch(match) : null;
      if (id) setMatchId(id);
    }
    if (!id) {
      setError("Could not find this match to unmatch.");
      return;
    }

    const ok = window.confirm(
      `Unmatch ${name}? You won’t see each other in matches or messages anymore.`
    );
    if (!ok) return;

    setUnmatching(true);
    setError("");
    try {
      const res = await unmatchUser(id);
      if (!res.ok) {
        setError(extractError(res.data, "Could not unmatch right now."));
        return;
      }
      try {
        localStorage.removeItem(`lm_chat_${storageKey}`);
      } catch {
        // ignore
      }
      removeInboxRoom(roomId);
      router.replace("/matches");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setUnmatching(false);
    }
  }

  async function sendChatText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError("");

    const optimistic: ChatMessage = {
      id: Date.now(),
      from: "me",
      text: trimmed,
      time: nowTime(),
      at: Date.now(),
      isRead: false,
      delivery: "sending",
    };
    setMessages((prev) => {
      const next = [...prev, optimistic];
      bumpOutgoing(roomId, trimmed, optimistic.at, peerMeta());
      syncInboxFromMessages(roomId, next, peerMeta());
      saveChatMessages(storageKey, next);
      return next;
    });
    lastSentRef.current = trimmed;
    scrollBottom();

    setSending(true);
    try {
      const res = await sendMessage(trimmed, roomId);
      if (!res.ok || res.data?.error) {
        setError(extractError(res.data, "Message failed to save."));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id ? { ...m, delivery: "failed" as const } : m
          )
        );
        return;
      }

      if (res.data?.sender_id != null) {
        rememberOwnSenderId(res.data.sender_id);
      }

      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === optimistic.id
            ? {
                ...m,
                id: res.data?.message_id ?? m.id,
                delivery: "sent" as const,
              }
            : m
        );
        saveChatMessages(storageKey, next);
        syncInboxFromMessages(roomId, next, peerMeta());
        return next;
      });
    } catch {
      setError("Network error. Message not sent.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...m, delivery: "failed" as const } : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendChatText(text);
  }

  async function handleChallenge(slug: GameSlug) {
    setGamePickerOpen(false);
    await sendChatText(encodeChallenge(slug, createChallengeId()));
  }

  const showDateSeparator = (index: number) => {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].at).toDateString();
    const curr = new Date(messages[index].at).toDateString();
    return prev !== curr;
  };

  return (
    <div
      className="mobile-shell flex flex-col bg-[#f8f3fa] overflow-hidden fixed inset-x-0 mx-auto z-40"
      style={{
        top: offsetTop,
        height: viewportHeight ?? "100dvh",
        maxWidth: "600px",
      }}
    >
      <div className="pointer-events-none absolute inset-0 chat-wallpaper" />
      <header className="relative z-20 flex items-center gap-2.5 px-4 py-3 bg-white/95 backdrop-blur-xl border-b border-primary/10 flex-shrink-0 pt-safe">
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
            <p className={`text-xs font-semibold truncate ${peerTyping ? "text-primary" : "text-muted"}`}>
              {peerTyping ? `${name} is typing…` : connected ? "Online" : "Connecting…"}
            </p>
          </div>
        </div>

        <Link
          href={buildAudioCallHref(socketRoomId ?? roomId)}
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
          href={buildVideoCallHref(socketRoomId ?? roomId)}
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
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-dark hover:bg-border/60 transition-colors text-left"
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
                <button
                  type="button"
                  disabled={unmatching}
                  onClick={() => void handleUnmatch()}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left border-t border-border disabled:opacity-60"
                >
                  {unmatching ? (
                    <span className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {unmatching ? "Unmatching…" : "Unmatch"}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div
        ref={listRef}
        className="relative z-[1] flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-3 space-y-1.5"
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
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/80 border border-primary/15 shadow-card flex items-center justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <p className="font-bold text-dark text-lg mb-1">You matched with {name}!</p>
            <p className="max-w-[260px] mx-auto">Break the ice and start something meaningful ✨</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const startsGroup = !previous || previous.from !== msg.from || showDateSeparator(index);
          const endsGroup = !next || next.from !== msg.from;
          const challenge = parseGameChallenge(msg.text);
          return (
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
              {msg.from === "them" && endsGroup ? (
                <Avatar photo={photo} name={name} size="sm" className="!w-8 !h-8 text-[10px] mb-1" />
              ) : msg.from === "them" ? <span className="w-8 flex-shrink-0" /> : null}
              {challenge ? (
                <GameChallengeCard
                  payload={challenge}
                  fromMe={msg.from === "me"}
                  roomId={roomId}
                  time={msg.time}
                />
              ) : (
              <div
                className={`max-w-[79%] px-4 py-2.5 text-[15px] leading-6 scroll-mb-24 transition-all ${
                  msg.from === "me"
                    ? `bg-gradient-to-br from-primary to-[#d946ef] text-white shadow-[0_5px_16px_rgba(247,89,245,0.2)] ${startsGroup ? "rounded-t-2xl" : "rounded-tl-2xl rounded-tr-md"} ${endsGroup ? "rounded-bl-2xl rounded-br-md" : "rounded-b-2xl"}`
                    : `bg-white/95 text-dark shadow-[0_4px_14px_rgba(34,24,44,0.08)] border border-white ${startsGroup ? "rounded-t-2xl" : "rounded-tr-2xl rounded-tl-md"} ${endsGroup ? "rounded-br-2xl rounded-bl-md" : "rounded-b-2xl"}`
                }`}
              >
                <p className="break-words">{msg.text}</p>
                <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${msg.from === "me" ? "text-white/65" : "text-muted"}`}>
                  <span>{msg.time}</span>
                  <MessageTicks message={msg} />
                </div>
              </div>
              )}
            </div>
          </div>
        )})}

        {peerTyping && (
          <div className="flex items-end gap-2 pt-1">
            <Avatar photo={photo} name={name} size="sm" className="!w-8 !h-8 text-[10px]" />
            <div className="bg-white/95 border border-white shadow-card rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1" aria-label={`${name} is typing`}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={() => void handleSend()}
        sending={sending}
        error={error}
        keyboardOpen={keyboardOpen}
        keyboardInset={keyboardInset}
        onFocus={() => scrollBottom(false)}
        onOpenGames={() => setGamePickerOpen(true)}
      />

      {gamePickerOpen && (
        <>
          <div
            className="absolute inset-0 z-30 bg-black/35"
            onClick={() => setGamePickerOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white px-5 pt-4 pb-safe shadow-card">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="section-kicker mb-0.5">Icebreaker</p>
                <h2 className="text-lg font-bold text-dark">Challenge to a game</h2>
              </div>
              <button
                type="button"
                onClick={() => setGamePickerOpen(false)}
                className="w-8 h-8 rounded-full bg-border flex items-center justify-center"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#12151C" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-muted mb-3">
              They get a card in chat. Each of you plays on your own device, then shares a score.
            </p>
            <div className="grid grid-cols-2 gap-2 pb-4">
              {GAMES.map((game) => (
                <button
                  key={game.slug}
                  type="button"
                  onClick={() => void handleChallenge(game.slug)}
                  className="text-left rounded-2xl border border-primary/10 bg-surface p-3 pressable"
                >
                  <span className="text-2xl">{game.emoji}</span>
                  <p className="text-sm font-bold text-dark mt-1">{game.title}</p>
                  <p className="text-[11px] text-muted">{game.tagline}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
