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

  const kicker = payload.kind === "score" ? "Score shared" : fromMe ? "You sent a game" : "Game invite";
  const cta = payload.kind === "score" ? "Play this game" : fromMe ? "Play now" : "Play now";
  const blurb =
    payload.kind === "score"
      ? `Scored ${payload.score ?? 0}. Beat it on your side.`
      : game.tagline;

  return (
    <div className="w-[min(100%,268px)] overflow-hidden rounded-[20px] bg-white text-dark ring-1 ring-black/5 shadow-[0_10px_28px_rgba(18,21,28,0.10)]">
      <div className={`relative h-[72px] bg-gradient-to-br ${game.accent}`}>
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative h-full flex items-end justify-between px-3.5 pb-2.5">
          <span className="text-[28px] leading-none drop-shadow-sm">{game.emoji}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">
            {kicker}
          </span>
        </div>
      </div>
      <div className="px-3.5 pt-3 pb-3.5">
        <p className="text-[16px] font-extrabold text-dark leading-tight">{game.title}</p>
        <p className="text-[13px] text-muted mt-1 leading-5">{blurb}</p>
        <Link
          href={playHref}
          className="mt-3 flex items-center justify-center h-11 rounded-2xl bg-primary text-white text-sm font-bold pressable hover:opacity-90"
        >
          {cta}
        </Link>
        <p className="mt-2 text-right text-[10px] text-muted">{time}</p>
      </div>
    </div>
  );
}
