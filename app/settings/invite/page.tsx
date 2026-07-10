"use client";
import { useState } from "react";
import { BackHeader } from "@/components/Header";
import LetsMeetLogo from "@/components/LetsMeetLogo";

const REFERRAL_LINK = "https://letsmeet.app/invite/X4K8";

export default function InvitePage() {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(REFERRAL_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({ title: "Join me on LetsMeet", url: REFERRAL_LINK });
    } else {
      copyLink();
    }
  }

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Invite Friends" backHref="/account" />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-8">
        <LetsMeetLogo size={88} className="mb-6" />

        <h1 className="screen-title mb-2 text-center">Invite Your Friends</h1>
        <p className="text-sm text-muted text-center leading-5 mb-8 max-w-xs">
          Share your link — when a friend joins LetsMeet through it, you both unlock perks.
        </p>

        {/* Link box */}
        <div className="w-full bg-primary-light rounded-2xl p-4 border-2 border-primary mb-6">
          <p className="text-xs text-muted mb-1.5 text-center">Your Invite Link</p>
          <p className="text-sm font-bold text-primary text-center break-all">{REFERRAL_LINK}</p>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button onClick={shareLink} className="btn-primary flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="18" cy="5" r="3" stroke="white" strokeWidth="2" />
              <circle cx="6" cy="12" r="3" stroke="white" strokeWidth="2" />
              <circle cx="18" cy="19" r="3" stroke="white" strokeWidth="2" />
              <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Share Link
          </button>
          <button onClick={copyLink} className="btn-secondary flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="#F759F5" strokeWidth="2" />
              <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
