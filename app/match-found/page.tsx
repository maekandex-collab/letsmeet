import Link from "next/link";
import { BackHeader } from "@/components/Header";

export default function MatchFoundPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-dark">
      <BackHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-28 text-center">
        {/* Star burst background */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl scale-150" />

          {/* Two overlapping circles */}
          <div className="relative flex items-center justify-center -space-x-6">
            <div className="w-28 h-28 rounded-full border-4 border-dark bg-[#D5E8F5] shadow-card flex items-center justify-center z-10">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#3E36ED" strokeWidth="2" />
                <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="w-28 h-28 rounded-full border-4 border-dark bg-[#F5D5E8] shadow-card flex items-center justify-center z-0">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="white" />
              </svg>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 mb-4">
          <span className="text-primary font-bold text-sm">100% Match</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">It&apos;s a Match! 🎉</h1>
        <p className="text-base text-white/70 leading-6 max-w-xs">
          You and Sophiya have liked each other! Start a conversation now.
        </p>
      </div>

      <div className="bottom-bar bg-dark border-dark flex-col gap-3">
        <Link href="/chat" className="btn-primary">
          Start Conversation
        </Link>
        <Link href="/home" className="btn-secondary">
          Keep Swiping
        </Link>
      </div>
    </div>
  );
}
