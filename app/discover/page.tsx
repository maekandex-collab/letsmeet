import Link from "next/link";
import { BackHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function DiscoverPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-dvh">
      <BackHeader
        title="Discover"
        right={
          <Link href="/filter" className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-light">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </Link>
        }
      />
      <div className="flex-1 flex flex-col pt-header pb-bottom-nav">
        {/* Location bar */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#F759F5" />
            </svg>
            <span className="text-sm font-semibold text-dark">New York</span>
            <span className="text-xs text-muted">• within 10 miles</span>
          </div>
          <button className="text-sm font-semibold text-primary">Change</button>
        </div>

        {/* Map placeholder */}
        <div className="relative flex-1 bg-[#E8F0EE] flex items-center justify-center overflow-hidden">
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#C5D8D0" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Profile pins */}
          {[
            { top: "28%", left: "25%", name: "Sophia", img: "" },
            { top: "45%", left: "55%", name: "Isabella", img: "" },
            { top: "62%", left: "30%", name: "Maria", img: "" },
            { top: "35%", left: "70%", name: "Tina", img: "" },
          ].map((pin) => (
            <div
              key={pin.name}
              className="absolute"
              style={{ top: pin.top, left: pin.left }}
            >
              <div className="relative w-12 h-12">
                <div className="w-12 h-12 rounded-full border-2 border-white bg-primary-light shadow-card overflow-hidden flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                    <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
              </div>
            </div>
          ))}

          {/* Center pin (you) */}
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-full border-4 border-white bg-primary shadow-card flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2" />
                <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white" />
          </div>

          {/* Radius ring */}
          <div className="absolute w-48 h-48 rounded-full border-2 border-primary/30 bg-primary/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
