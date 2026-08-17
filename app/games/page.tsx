"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { GAMES, type GameMeta } from "@/lib/games";
import { PageEnter, StaggerItem, StaggerList } from "@/lib/motion";

function useHighScores() {
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const game of GAMES) {
      const raw = window.localStorage.getItem(game.highScoreKey);
      const value = raw ? Number.parseInt(raw, 10) : 0;
      next[game.slug] = Number.isFinite(value) ? value : 0;
    }
    setScores(next);
  }, []);

  return scores;
}

function GameCard({ game, highScore }: { game: GameMeta; highScore: number }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="glass-card overflow-hidden pressable block"
    >
      <div className={`h-24 bg-gradient-to-br ${game.accent} relative`}>
        <span className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-sm">
          {game.emoji}
        </span>
        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-white/90 bg-black/20 px-2 py-1 rounded-full">
          {game.difficulty}
        </span>
      </div>
      <div className="p-4">
        <p className="section-kicker mb-1">{game.tagline}</p>
        <h2 className="text-lg font-bold text-dark">{game.title}</h2>
        <p className="text-sm text-muted mt-1 leading-5">{game.description}</p>
        <p className="text-xs text-muted mt-2">{game.howTo}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-primary">
            Best: {highScore}
          </span>
          <span className="text-sm font-bold text-accent">Play</span>
        </div>
      </div>
    </Link>
  );
}

export default function GamesHubPage() {
  const scores = useHighScores();

  return (
    <div className="mobile-shell flex flex-col min-h-dvh">
      <BackHeader title="Play Games" subtitle="Quick breaks between matches" backHref="/home" />
      <PageEnter className="flex-1 overflow-y-auto pt-header pb-bottom-nav">
        <div className="px-5 pt-3 pb-2">
          <p className="section-kicker mb-1">Arcade</p>
          <h1 className="text-2xl font-bold text-dark">LetsMeet Games</h1>
          <p className="text-sm text-muted mt-1.5">
            Play solo, or challenge a match from chat. High scores stay on this device — they are not verified by the server.
          </p>
        </div>
        <StaggerList className="px-5 pb-6 grid gap-4">
          {GAMES.map((game) => (
            <StaggerItem key={game.slug}>
              <GameCard game={game} highScore={scores[game.slug] ?? 0} />
            </StaggerItem>
          ))}
        </StaggerList>
      </PageEnter>
      <BottomNav />
    </div>
  );
}
