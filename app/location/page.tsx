import Link from "next/link";
import { BackHeader } from "@/components/Header";

export default function LocationPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-32 text-center">
        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center mb-10">
          <div className="absolute w-48 h-48 rounded-full bg-primary/5" />
          <div className="absolute w-36 h-36 rounded-full bg-primary/10" />
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#F759F5" />
              <circle cx="12" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
        </div>

        <h1 className="screen-title mb-3">Enable Location</h1>
        <p className="text-base text-muted leading-6 max-w-xs">
          Allow LetsMeet to access your location to find matches near you. Your location is never shared publicly.
        </p>
      </div>

      <div className="bottom-bar flex-col gap-3">
        <Link href="/profile-setup" className="btn-primary">Allow Location Access</Link>
        <Link href="/profile-setup" className="btn-secondary">Not now</Link>
      </div>
    </div>
  );
}

