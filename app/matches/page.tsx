"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const NEW_MATCHES = [
  { name: "Jenny Lio",        age: 28, state: "New York",    photo: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Starlight",        age: 24, state: "California",  photo: "https://randomuser.me/api/portraits/women/68.jpg" },
  { name: "Kimico Joi",       age: 21, state: "Florida",     photo: "https://randomuser.me/api/portraits/women/12.jpg" },
  { name: "Annie Bansal",     age: 25, state: "Texas",       photo: "https://randomuser.me/api/portraits/women/29.jpg" },
  { name: "Arya Stark",       age: 22, state: "Illinois",    photo: "https://randomuser.me/api/portraits/women/55.jpg" },
  { name: "Sansa Stark",      age: 26, state: "Georgia",     photo: "https://randomuser.me/api/portraits/women/33.jpg" },
];

const ALL_MATCHES = [
  { name: "Kimico Joi",    photo: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Annie Bansal",  photo: "https://randomuser.me/api/portraits/women/68.jpg" },
  { name: "Sansa Stark",   photo: "https://randomuser.me/api/portraits/women/12.jpg" },
  { name: "Tima Luciya",   photo: "https://randomuser.me/api/portraits/women/29.jpg" },
  { name: "Arya Stark",    photo: "https://randomuser.me/api/portraits/women/55.jpg" },
  { name: "Sarah Johnson", photo: "https://randomuser.me/api/portraits/women/33.jpg" },
  { name: "Olivia Chen",   photo: "https://randomuser.me/api/portraits/women/76.jpg" },
  { name: "Priya Sharma",  photo: "https://randomuser.me/api/portraits/women/90.jpg" },
];

export default function MatchesPage() {
  const [slide, setSlide] = useState(0);
  const total = NEW_MATCHES.length;
  const trackRef = useRef<HTMLDivElement>(null);

  // Auto-advance every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % total);
    }, 3000);
    return () => clearInterval(id);
  }, [total]);

  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-white">
      <LogoHeader
        right={
          <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-full">
            329 Matches
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto pt-20 pb-28">

        {/* ── New Match slider ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-bold text-dark">New Match</h2>
            <Link href="/matches" className="flex items-center gap-1 text-sm font-semibold text-dark">
              View all
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#12151C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Slider viewport — overflow hidden, shows exactly 2 cards */}
          <div className="overflow-hidden px-5">
            <div
              ref={trackRef}
              className="flex gap-3 transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(calc(-${slide} * (50% + 6px)))` }}
            >
              {/* Duplicate last card at front for smooth looping feel */}
              {[...NEW_MATCHES, ...NEW_MATCHES].map((m, i) => (
                <Link
                  key={i}
                  href="/profile-single"
                  className="shrink-0 relative rounded-[22px] overflow-hidden"
                  style={{ width: "calc(50% - 6px)", aspectRatio: "3/4" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                  {/* Blue/purple gradient overlay — matches original */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(180deg, rgba(62,54,237,0.00) 40%, #3E36ED 100%)",
                    }}
                  />
                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-white font-bold text-[15px] mb-2 leading-tight">{m.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/40">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4"/>
                        </svg>
                        {m.age} yr
                      </span>
                      <span className="flex items-center gap-1 text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/40">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        </svg>
                        {m.state}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {NEW_MATCHES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === slide % NEW_MATCHES.length
                    ? "bg-primary w-5 h-1.5"
                    : "bg-border w-1.5 h-1.5"
                }`}
              />
            ))}
          </div>
        </section>

        {/* ── All Match ── */}
        <section>
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-bold text-dark">All Match</h2>
            <Link href="/matches" className="flex items-center gap-1 text-sm font-semibold text-dark">
              View all
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#12151C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Horizontal scroll row — 4 cards visible */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-1">
            {ALL_MATCHES.map((m) => (
              <Link
                key={m.name}
                href="/profile-single"
                className="flex-shrink-0 flex flex-col items-center gap-1.5"
                style={{ width: "calc(25% - 9px)" }}
              >
                <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.photo}
                    alt={m.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <p className="text-xs font-semibold text-dark text-center truncate w-full">
                  {m.name.split(" ")[0]}
                </p>
              </Link>
            ))}
          </div>
        </section>

      </div>
      <BottomNav />
    </div>
  );
}
