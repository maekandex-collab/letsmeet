"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LetsMeetLogo from "@/components/LetsMeetLogo";

interface BackHeaderProps {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
}

export function BackHeader({ title, subtitle, right, onBack, backHref }: BackHeaderProps) {
  const router = useRouter();
  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-mobile px-4 py-4 flex items-center justify-between z-50 pt-safe">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => onBack ? onBack() : backHref ? router.push(backHref) : router.back()}
          className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-2xl bg-[#F5F5F5] hover:bg-[#EBEBEB] transition-colors"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="#12151C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {title && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-dark truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
          </div>
        )}
      </div>
      {right && <div className="flex items-center gap-2 flex-shrink-0 ml-2">{right}</div>}
    </header>
  );
}

interface LogoHeaderProps {
  right?: React.ReactNode;
}

export function LogoHeader({ right }: LogoHeaderProps) {
  return (
    <header className="app-header">
      <Link href="/home" className="flex items-center">
        <LetsMeetLogo size={32} showWordmark priority />
      </Link>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </header>
  );
}
