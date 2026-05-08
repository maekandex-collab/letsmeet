"use client";
import { useState } from "react";
import Link from "next/link";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const CARDS = [
  { id: 1, name: "Sophiya Calzoni",  age: 24, city: "New York",    job: "Photographer", tags: ["Travel", "Art", "Coffee"],     photo: "https://randomuser.me/api/portraits/women/44.jpg" },
  { id: 2, name: "Isabella Uzo",     age: 22, city: "Los Angeles", job: "Designer",     tags: ["Music", "Yoga", "Cooking"],    photo: "https://randomuser.me/api/portraits/women/68.jpg" },
  { id: 3, name: "Elizabeth Maria",  age: 28, city: "Florida",     job: "Teacher",      tags: ["Books", "Movies", "Dance"],    photo: "https://randomuser.me/api/portraits/women/12.jpg" },
  { id: 4, name: "Tina Schaefer",    age: 25, city: "Chicago",     job: "Nurse",        tags: ["Fitness", "Nature", "Pets"],   photo: "https://randomuser.me/api/portraits/women/29.jpg" },
  { id: 5, name: "Maria Panola",     age: 22, city: "Miami",       job: "Model",        tags: ["Fashion", "Beaches", "Food"],  photo: "https://randomuser.me/api/portraits/women/55.jpg" },
  { id: 6, name: "Sarah Johnson",    age: 26, city: "Houston",     job: "Engineer",     tags: ["Tech", "Gaming", "Hiking"],    photo: "https://randomuser.me/api/portraits/women/33.jpg" },
  { id: 7, name: "Olivia Chen",      age: 23, city: "Seattle",     job: "Artist",       tags: ["Painting", "Music", "Coffee"], photo: "https://randomuser.me/api/portraits/women/76.jpg" },
];

export default function HomePage() {
  const [current, setCurrent]     = useState(0);
  const [direction, setDirection] = useState<null | "left" | "right">(null);
  const [animating, setAnimating] = useState(false);

  function swipe(dir: "left" | "right") {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent((c) => (c + 1) % CARDS.length);
      setDirection(null);
      setAnimating(false);
    }, 420);
  }

  return (
    <div className="mobile-shell flex flex-col bg-white overflow-hidden" style={{ height: "100dvh" }}>
      <LogoHeader
        right={
          <Link href="/filter" className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-light">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </Link>
        }
      />

      <div className="flex flex-col px-5 pt-20 pb-24" style={{ height: "100dvh" }}>
        {/* Subheader + progress dots */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-dark">Discover</h2>
            <p className="text-xs text-muted mt-0.5">Find your perfect match</p>
          </div>
          <div className="flex gap-1.5 items-center">
            {CARDS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? "bg-primary w-5 h-2" : "bg-border w-2 h-2"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card stack */}
        <div className="relative flex-1 min-h-0">
          {CARDS.map((card, i) => {
            const rawOffset = (i - current + CARDS.length) % CARDS.length;
            if (rawOffset > 2) return null;

            const isTop  = rawOffset === 0;
            const isMid  = rawOffset === 1;
            const isBack = rawOffset === 2;

            let transform  = "";
            let transition = "";
            const zIndex   = 3 - rawOffset;

            if (isTop) {
              if (direction === "right") {
                transform = "translateX(160%) rotate(28deg)";
              } else if (direction === "left") {
                transform = "translateX(-160%) rotate(-28deg)";
              } else {
                transform = "translateX(0) rotate(0deg) scale(1)";
              }
              transition = direction
                ? "transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94)"
                : "transform 0.3s ease";
            } else if (isMid) {
              transform  = animating ? "scale(0.97) translateY(8px)"  : "scale(0.93) translateY(16px)";
              transition = "transform 0.42s ease";
            } else if (isBack) {
              transform  = animating ? "scale(0.93) translateY(16px)" : "scale(0.87) translateY(30px)";
              transition = "transform 0.42s ease";
            }

            return (
              <div
                key={card.id}
                className="absolute inset-x-0 inset-y-0"
                style={{ transform, transition, zIndex, willChange: "transform" }}
              >
                <div className="relative rounded-[28px] overflow-hidden h-full" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                  {/* Photo background */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.photo} alt={card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
                  {/* Bottom fade for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                  {/* LIKE stamp */}
                  {isTop && direction === "right" && (
                    <div className="absolute top-10 left-6 px-4 py-2 rounded-xl border-[3px] border-green-400 -rotate-12">
                      <span className="text-green-400 font-black text-2xl tracking-wider">LIKE</span>
                    </div>
                  )}
                  {/* NOPE stamp */}
                  {isTop && direction === "left" && (
                    <div className="absolute top-10 right-6 px-4 py-2 rounded-xl border-[3px] border-red-400 rotate-12">
                      <span className="text-red-400 font-black text-2xl tracking-wider">NOPE</span>
                    </div>
                  )}

                  {/* Card info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <h2 className="text-[1.55rem] font-bold text-white leading-tight">
                          {card.name}, {card.age}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.75)">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                          </svg>
                          <span className="text-white/75 text-sm">{card.city}</span>
                          <span className="text-white/40">•</span>
                          <span className="text-white/75 text-sm">{card.job}</span>
                        </div>
                      </div>
                      <Link
                        href="/profile-single"
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                          <path d="M12 16v-5M12 8v-.01" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                        </svg>
                      </Link>
                    </div>

                    {/* Interest tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-5 mt-4 shrink-0">
          {/* Dislike */}
          <button
            onClick={() => swipe("left")}
            disabled={animating}
            className="w-14 h-14 rounded-full border-2 border-border bg-white shadow-card flex items-center justify-center active:scale-90 transition-transform disabled:opacity-60"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#F75959" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Like */}
          <button
            onClick={() => swipe("right")}
            disabled={animating}
            className="w-[68px] h-[68px] rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-60"
            style={{ boxShadow: "0 8px 24px rgba(247,89,245,0.45)" }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="white" />
            </svg>
          </button>

          {/* Profile info */}
          <Link
            href="/profile-single"
            className="w-14 h-14 rounded-full border-2 border-border bg-white shadow-card flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#12151C" strokeWidth="2"/>
              <path d="M12 16v-5M12 8v-.01" stroke="#12151C" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
