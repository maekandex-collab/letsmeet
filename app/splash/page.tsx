import Link from "next/link";

// Floating hearts rendered behind the content. Values are deterministic
// (no Math.random) so server and client markup match.
const FLOATING_HEARTS = [
  { left: "8%",  size: 16, delay: "0s",   duration: "14s", opacity: 0.25 },
  { left: "20%", size: 26, delay: "3.5s", duration: "18s", opacity: 0.18 },
  { left: "33%", size: 12, delay: "6s",   duration: "12s", opacity: 0.30 },
  { left: "46%", size: 20, delay: "1.5s", duration: "16s", opacity: 0.20 },
  { left: "58%", size: 14, delay: "8s",   duration: "13s", opacity: 0.28 },
  { left: "70%", size: 30, delay: "4.5s", duration: "20s", opacity: 0.15 },
  { left: "82%", size: 18, delay: "2.5s", duration: "15s", opacity: 0.22 },
  { left: "91%", size: 22, delay: "7s",   duration: "17s", opacity: 0.18 },
];

function HeartGlyph({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function SplashPage() {
  return (
    <div className="mobile-shell relative min-h-screen overflow-hidden flex flex-col">
      {/* Base gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #2a0b3f 0%, #4a1063 38%, #7d1480 70%, #b5179e 100%)",
        }}
      />

      {/* Animated color blobs */}
      <div
        className="absolute -top-24 -left-20 w-72 h-72 rounded-full blur-3xl opacity-50 animate-splash-blob"
        style={{ background: "radial-gradient(circle, #F759F5 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full blur-3xl opacity-40 animate-splash-blob"
        style={{ background: "radial-gradient(circle, #8a2be2 0%, transparent 70%)", animationDelay: "4s" }}
      />
      <div
        className="absolute -bottom-28 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-40 animate-splash-blob"
        style={{ background: "radial-gradient(circle, #ff6ad5 0%, transparent 70%)", animationDelay: "8s" }}
      />

      {/* Floating hearts */}
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

      {/* Subtle dark vignette at the bottom for button contrast */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(20,5,30,0) 0%, rgba(20,5,30,0.55) 100%)" }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center">
        {/* Logo */}
        <div className="animate-splash-logo-in">
          <div
            className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-[#F759F5] to-[#b5179e] flex items-center justify-center animate-splash-glow"
          >
            <HeartGlyph className="w-12 h-12 text-white animate-splash-heartbeat" />
          </div>
        </div>

        {/* Wordmark */}
        <h1
          className="text-5xl font-extrabold text-white mt-7 tracking-tight animate-splash-rise"
          style={{ animationDelay: "0.2s" }}
        >
          Lets<span className="text-[#FFD1FB]">Meet</span>
        </h1>

        {/* Tagline */}
        <p
          className="text-sm font-semibold text-white/75 uppercase tracking-[0.3em] mt-3 animate-splash-rise"
          style={{ animationDelay: "0.35s" }}
        >
          Match · Chat · Love
        </p>

        <p
          className="text-base text-white/60 leading-6 mt-6 max-w-xs animate-splash-rise"
          style={{ animationDelay: "0.5s" }}
        >
          Meet genuine people near you and start something real today.
        </p>
      </div>

      {/* ── Bottom actions ── */}
      <div
        className="relative z-10 px-6 pb-10 flex flex-col items-center gap-4 animate-splash-rise"
        style={{ animationDelay: "0.65s" }}
      >
        <Link
          href="/onboarding"
          className="w-full max-w-xs py-4 px-8 rounded-2xl bg-white text-[#b5179e] font-bold text-lg text-center shadow-xl transition-transform active:scale-95 hover:shadow-2xl"
        >
          Let&apos;s Start
        </Link>
        <Link
          href="/sign-in"
          className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
