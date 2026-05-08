import Link from "next/link";

export default function VideoCallPage() {
  return (
    <div className="mobile-shell flex flex-col h-screen bg-dark relative overflow-hidden">
      {/* Full-screen remote video placeholder */}
      <div className="absolute inset-0 bg-[#1a2030] flex items-center justify-center">
        <div className="w-36 h-36 rounded-full bg-[#2a2a40] flex items-center justify-center">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#616568" strokeWidth="2" />
            <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Self view */}
      <div className="absolute top-20 right-4 w-28 h-40 rounded-2xl bg-[#2a2a40] border-2 border-white/20 overflow-hidden flex items-center justify-center shadow-card z-10">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="#616568" strokeWidth="2" />
          <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-14 pb-4">
        <Link href="/chat" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
        <div className="text-center">
          <p className="text-white font-bold text-base">Sophiya Calzoni</p>
          <p className="text-white/60 text-xs">00:02:15</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 px-8 pb-16 z-10">
        <div className="flex items-center justify-center gap-5">
          <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="white" strokeWidth="2" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href="/messages"
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-card rotate-[135deg]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72 12.1 12.1 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.1 12.1 0 0 0 2.81.7A2 2 0 0 1 22 14.92z" fill="white" />
            </svg>
          </Link>
          <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <polygon points="23 7 16 12 23 17 23 7" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <rect x="1" y="5" width="15" height="14" rx="2" stroke="white" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
