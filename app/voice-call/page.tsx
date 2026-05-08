import Link from "next/link";

export default function VoiceCallPage() {
  return (
    <div className="mobile-shell flex flex-col h-screen bg-dark relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-dark to-dark" />

      {/* Ripple rings */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[160, 220, 280].map((size) => (
          <div
            key={size}
            className="absolute rounded-full border border-primary/20"
            style={{
              width: size,
              height: size,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center gap-4">
        {/* Avatar */}
        <div className="w-28 h-28 rounded-full border-4 border-primary bg-primary-light flex items-center justify-center shadow-card">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
            <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Sophiya Calzoni</h2>
        <p className="text-base text-white/60">00:04:32</p>
      </div>

      {/* Controls */}
      <div className="relative px-8 pb-16 flex flex-col gap-6">
        <div className="flex items-center justify-center gap-6">
          <button className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <path d="M19.07 4.93A10 10 0 0 1 19.07 19.07" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M15.54 8.46A5 5 0 0 1 15.54 15.54" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href="/messages"
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-card rotate-[135deg]"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72 12.1 12.1 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.1 12.1 0 0 0 2.81.7A2 2 0 0 1 22 14.92z" fill="white" />
            </svg>
          </Link>
          <button className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="white" strokeWidth="2" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
