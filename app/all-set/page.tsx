"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/letsmeet";

/**
 * End of signup/setup — backend session after profile upload is incomplete,
 * so we clear local auth and require a fresh sign-in via /login/user.
 */
export default function AllSetPage() {
  const router = useRouter();
  const clearedRef = useRef(false);

  useEffect(() => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    clearSession();
  }, []);

  function goToSignIn() {
    if (!clearedRef.current) {
      clearedRef.current = true;
      clearSession();
    }
    router.replace("/sign-in?registered=1");
  }

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-32 text-center">
        <div className="w-36 h-36 rounded-full bg-primary-light flex items-center justify-center mb-8 shadow-card">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#F759F5" fillOpacity="0.15" stroke="#F759F5" strokeWidth="2" />
            <path d="M8 12.5L10.5 15L16 9" stroke="#F759F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-dark mb-3">Registration successful</h1>
        <p className="text-base text-muted leading-6 max-w-xs">
          Your profile is ready. Sign in with your phone and PIN to start matching with a full session.
        </p>
      </div>

      <div className="bottom-bar">
        <button type="button" onClick={goToSignIn} className="btn-primary">
          Continue to Sign In
        </button>
      </div>
    </div>
  );
}
