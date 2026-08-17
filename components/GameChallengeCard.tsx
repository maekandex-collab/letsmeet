"use client";

import Link from "next/link";
import { getGame } from "@/lib/games";
import {
  buildGamePlayHref,
  type GameChallengePayload,
} from "@/lib/gameChallenge";

export default function GameChallengeCard({
  payload,
  fromMe,
  roomId,
  time,
}: {
  payload: GameChallengePayload;
  fromMe: boolean;
  roomId: string | number;
  time: string;
}) {
  const game = getGame(payload.slug);
  if (!game) return null;

  const playHref = buildGamePlayHref({
    slug: payload.slug,
    roomId,
    challengeId: payload.challengeId,
  });

  return (
    <div
      className={`w-[min(100%,280px)] overflow-hidden rounded-[22px] border shadow-card ${
        fromMe
          ? "border-white/20 bg-white/15 text-white"
          : "border-primary/15 bg-white text-dark"
      }`}
    >
      <div className={`h-16 bg-gradient-to-br ${game.accent} flex items-center justify-center text-3xl`}>
        {game.emoji}
      </div>
      <div className="px-3.5 py-3">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${fromMe ? "text-white/70" : "text-primary"}`}>
          {payload.kind === "score" ? "Score shared" : "Async challenge"}
        </p>
        <p className="text-[15px] font-bold mt-0.5">{game.title}</p>
        {payload.kind === "score" ? (
          <p className={`text-sm mt-1 ${fromMe ? "text-white/80" : "text-muted"}`}>
            Scored {payload.score ?? 0} this round. Play on your own, then share yours.
          </p>
        ) : (
          <p className={`text-sm mt-1 ${fromMe ? "text-white/80" : "text-muted"}`}>
            {game.howTo} Not live multiplayer — each of you plays, then shares a score.
          </p>
        )}
        <Link
          href={playHref}
          className={`mt-3 flex items-center justify-center h-10 rounded-full text-sm font-bold pressable ${
            fromMe
              ? "bg-white text-dark"
              : "bg-gradient-to-br from-primary to-[#d946ef] text-white"
          }`}
        >
          {payload.kind === "score" ? "Play this game" : fromMe ? "Play now" : "Accept challenge"}
        </Link>
        <p className={`mt-2 text-right text-[10px] ${fromMe ? "text-white/60" : "text-muted"}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
