import Link from "next/link";
import { BackHeader } from "@/components/Header";

export default function FingerprintPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-32 text-center">
        <div className="w-32 h-32 rounded-full bg-primary-light flex items-center justify-center mb-8 shadow-card">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C12 22 4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 12L11 14L15 10" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="screen-title mb-3">Finger Print</h1>
        <p className="text-base text-muted leading-6 max-w-xs">
          Use your fingerprint to quickly and securely access your LetsMeet account.
        </p>
      </div>

      <div className="bottom-bar flex-col gap-3">
        <Link href="/select-language" className="btn-primary">
          Enable Fingerprint
        </Link>
        <Link href="/select-language" className="btn-secondary">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
