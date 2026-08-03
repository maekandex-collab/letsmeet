"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LetsMeetLogo from "@/components/LetsMeetLogo";

const AUTO_MS = 5600;

const FLOATING_HEARTS = [
  { left: "8%", size: 16, delay: "0s", duration: "14s", opacity: 0.22 },
  { left: "22%", size: 24, delay: "3.5s", duration: "18s", opacity: 0.14 },
  { left: "40%", size: 12, delay: "6s", duration: "12s", opacity: 0.24 },
  { left: "58%", size: 18, delay: "1.5s", duration: "16s", opacity: 0.18 },
  { left: "74%", size: 28, delay: "4.5s", duration: "20s", opacity: 0.12 },
  { left: "88%", size: 14, delay: "7s", duration: "15s", opacity: 0.2 },
];

const SLIDES = [
  {
    id: "welcome",
    eyebrow: "Welcome to LetsMeet",
    title: (
      <>
        Love starts with a{" "}
        <span className="text-[#FFD1FB]">real</span> connection
      </>
    ),
    body: "Swipe less. Talk more. Meet people who are actually looking for something genuine.",
  },
  {
    id: "match",
    eyebrow: "Built for meaningful matches",
    title: (
      <>
        Find someone who{" "}
        <span className="text-[#FFD1FB]">fits</span> your vibe
      </>
    ),
    body: "Match, chat, and take it further — all in one calm place made for real chemistry.",
  },
] as const;

function HeartGlyph({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function FeatureChip({
  label,
  icon,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white/12 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg ${className ?? ""}`}
    >
      <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="text-xs font-semibold text-white whitespace-nowrap">{label}</span>
    </div>
  );
}

export default function WelcomeCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const last = SLIDES.length - 1;
  const isLast = index === last;

  const goTo = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setPaused(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function onTouchEnd() {
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(dx) > 48) {
      if (dx < 0) next();
      else prev();
    }
    window.setTimeout(() => setPaused(false), 1400);
  }

  return (
    <div
      className="mobile-shell relative h-dvh min-h-dvh overflow-hidden select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Shared stage — never swaps color between slides */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #2a0b3f 0%, #4a1063 36%, #7d1480 68%, #b5179e 100%)",
        }}
      />
      <div
        className="absolute -top-24 -left-20 w-72 h-72 rounded-full blur-3xl opacity-50 animate-splash-blob"
        style={{ background: "radial-gradient(circle, #F759F5 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full blur-3xl opacity-40 animate-splash-blob"
        style={{
          background: "radial-gradient(circle, #8a2be2 0%, transparent 70%)",
          animationDelay: "4s",
        }}
      />
      <div
        className="absolute -bottom-28 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-40 animate-splash-blob"
        style={{
          background: "radial-gradient(circle, #ff6ad5 0%, transparent 70%)",
          animationDelay: "8s",
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FLOATING_HEARTS.map((h, i) => (
          <HeartGlyph
            key={i}
            className="absolute bottom-0 text-white animate-splash-float-heart"
            style={{
              left: h.left,
              width: h.size,
              height: h.size,
              animationDelay: h.delay,
              animationDuration: h.duration,
              ["--o" as string]: h.opacity,
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(20,5,30,0) 0%, rgba(20,5,30,0.65) 100%)",
        }}
      />

      {/* Content stage */}
      <div
        className="relative z-10 h-full flex flex-col px-7 pb-44"
        role="region"
        aria-roledescription="carousel"
        aria-label="Welcome to LetsMeet"
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Persistent logo — never remounts between slides */}
          <div className="relative mb-8">
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative w-[5.25rem] h-[5.25rem] rounded-[26px] bg-white/95 shadow-2xl flex items-center justify-center p-2.5 animate-splash-glow">
              <LetsMeetLogo size={70} priority />
            </div>

            {/* Soft feature chips — only on slide 2, fade in without layout jump */}
            <div
              className={`absolute -right-16 -top-3 transition-all duration-500 ${
                index === 1
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <FeatureChip
                label="New matches"
                className="rotate-[6deg]"
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                      fill="#FFD1FB"
                    />
                  </svg>
                }
              />
            </div>
            <div
              className={`absolute -left-16 -bottom-2 transition-all duration-500 delay-75 ${
                index === 1
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              <FeatureChip
                label="Chat instantly"
                className="-rotate-[5deg]"
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="#FFD1FB"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Crossfading copy — same typography, no color flip */}
          <div className="relative w-full max-w-[20rem] min-h-[11.5rem]">
            {SLIDES.map((s, i) => {
              const active = i === index;
              return (
                <div
                  key={s.id}
                  aria-hidden={!active}
                  className={`absolute inset-x-0 top-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    active
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-3 scale-[0.98] pointer-events-none"
                  }`}
                >
                  <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.28em] mb-3">
                    {s.eyebrow}
                  </p>
                  <h1 className="text-[1.85rem] sm:text-3xl font-extrabold text-white leading-snug tracking-tight">
                    {s.title}
                  </h1>
                  <p className="text-[15px] text-white/60 leading-6 mt-4">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Persistent CTA chrome — same look on every slide */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-6 pt-8 pb-9 flex flex-col items-center gap-4 bg-gradient-to-t from-[#14051e] via-[#14051e]/85 to-transparent">
        <div className="flex items-center gap-2" role="tablist" aria-label="Welcome slides">
          {SLIDES.map((s, i) => {
            const active = i === index;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  goTo(i);
                  setPaused(true);
                  window.setTimeout(() => setPaused(false), 1600);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  active ? "w-7 bg-white" : "w-2 bg-white/35 hover:bg-white/55"
                }`}
              />
            );
          })}
        </div>

        <div className="w-full max-w-xs flex flex-col items-center gap-3">
          {isLast ? (
            <Link
              href="/get-started"
              className="w-full py-4 px-8 rounded-2xl bg-white text-[#b5179e] font-bold text-lg text-center shadow-xl hover:shadow-2xl active:scale-[0.98] transition-transform"
            >
              Create your account
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                next();
                setPaused(true);
                window.setTimeout(() => setPaused(false), 1800);
              }}
              className="w-full py-4 px-8 rounded-2xl bg-white text-[#b5179e] font-bold text-lg text-center shadow-xl hover:shadow-2xl active:scale-[0.98] transition-transform"
            >
              Continue
            </button>
          )}

          <p className="text-sm text-white/70">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-white hover:text-[#FFD1FB]">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
