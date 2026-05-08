import Link from "next/link";
import { BackHeader } from "@/components/Header";

export default function AllSetPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-32 text-center">
        <div className="w-36 h-36 rounded-full bg-primary-light flex items-center justify-center mb-8 shadow-card">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#F759F5" fillOpacity="0.15" stroke="#F759F5" strokeWidth="2" />
            <path d="M8 12.5L10.5 15L16 9" stroke="#F759F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-dark mb-3">You&apos;re All Set! 🎉</h1>
        <p className="text-base text-muted leading-6 max-w-xs">
          Your profile has been successfully set up. Time to start matching!
        </p>
      </div>

      <div className="bottom-bar">
        <Link href="/home" className="btn-primary">
          Go To Homepage
        </Link>
      </div>
    </div>
  );
}
