"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { getGame } from "@/lib/games";
import {
  createChallengeId,
  encodeScore,
  isSafeChatReturnPath,
  parseGameScoreMessage,
} from "@/lib/gameChallenge";
import {
  loadChatMessages,
  mergeChatMessages,
  saveChatMessages,
  sendMessage,
} from "@/lib/letsmeet";
import { bumpOutgoing } from "@/lib/chatInbox";

function GamePlayerInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = String(params.slug ?? "");
  const game = getGame(slug);

  const returnToRaw = searchParams.get("returnTo") ?? "";
  const returnTo = isSafeChatReturnPath(returnToRaw) ? returnToRaw : "/games";
  const roomId = searchParams.get("room") ?? "";
  const challengeId = searchParams.get("challenge") || createChallengeId();
  const fromChat = Boolean(roomId && isSafeChatReturnPath(`/chat/${roomId}`));

  const [score, setScore] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [iframeKey, setIframeKey] = useState(0);

  const iframeSrc = useMemo(() => game?.src ?? "", [game]);

  const onMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const parsed = parseGameScoreMessage(event.data);
      if (!parsed || parsed.slug !== slug) return;
      setScore(Math.max(0, Math.floor(parsed.score)));
    },
    [slug]
  );

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  async function sendScoreToChat() {
    if (score == null || !fromChat || !game) return;
    setSending(true);
    setSendError("");
    const text = encodeScore(game.slug, challengeId, score);
    try {
      const res = await sendMessage(text, roomId);
      if (!res.ok || res.data?.error) {
        setSendError("Could not send your score. Try again.");
        setSending(false);
        return;
      }
      const at = Date.now();
      const existing = loadChatMessages(roomId);
      saveChatMessages(
        roomId,
        mergeChatMessages(existing, [
          {
            id: res.data?.message_id ?? at,
            from: "me",
            text,
            time: new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            at,
            delivery: "sent",
          },
        ])
      );
      bumpOutgoing(roomId, text, at);
      router.push(returnTo);
    } catch {
      setSendError("Network error. Try again.");
      setSending(false);
    }
  }

  if (!game) {
    return (
      <div className="mobile-shell flex flex-col min-h-dvh">
        <BackHeader title="Game not found" backHref="/games" />
        <div className="flex-1 pt-header px-6 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-lg font-bold text-dark">That game isn&apos;t here.</p>
          <p className="text-sm text-muted">Pick another one from the arcade.</p>
          <Link href="/games" className="text-sm font-bold text-primary pressable">
            Back to games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-shell flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <BackHeader
        title={game.title}
        subtitle={fromChat ? "Async challenge" : game.tagline}
        backHref={returnTo}
      />
      <div className="flex-1 pt-header min-h-0 bg-black relative">
        <iframe
          key={iframeKey}
          title={game.title}
          src={iframeSrc}
          className="block w-full h-full border-0 bg-black"
          sandbox="allow-scripts allow-same-origin"
          allow="autoplay"
        />

        {score != null && (
          <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-safe">
            <div className="mb-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-primary/15 shadow-card p-4">
              <p className="section-kicker mb-1">This round</p>
              <p className="text-2xl font-bold text-dark">
                {score} <span className="text-base font-semibold text-muted">pts</span>
              </p>
              <p className="text-xs text-muted mt-1">
                Scores are self-reported from this device. Not a live match.
              </p>
              {sendError && <p className="text-xs text-red-500 mt-2">{sendError}</p>}
              <div className="mt-3 flex gap-2">
                {fromChat && (
                  <button
                    type="button"
                    onClick={() => void sendScoreToChat()}
                    disabled={sending}
                    className="flex-1 h-11 rounded-full bg-gradient-to-br from-primary to-[#d946ef] text-white text-sm font-bold pressable disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send score to chat"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setScore(null);
                    setIframeKey((n) => n + 1);
                  }}
                  className="flex-1 h-11 rounded-full bg-primary-light text-dark text-sm font-bold pressable"
                >
                  Play again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GamePlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell h-dvh flex items-center justify-center text-muted">
          Loading game…
        </div>
      }
    >
      <GamePlayerInner />
    </Suspense>
  );
}
