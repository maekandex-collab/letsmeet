"use client";
import { useState } from "react";
import { BackHeader } from "@/components/Header";
import Link from "next/link";

export default function SecurityPage() {
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-white">
      <BackHeader title="Security" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm mt-4">

          {/* Change PIN */}
          <Link
            href="/settings/security/change-pin"
            className="flex items-center gap-4 px-5 py-4 hover:bg-[#F5F5F5] transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EEEEFF] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#3E36ED" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#3E36ED"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark">Change PIN</p>
              <p className="text-xs text-muted mt-0.5">Update your 4-digit PIN</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <div className="h-px bg-border mx-5" />

          {/* Remember Me */}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-2xl bg-[#EEEEFF] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#3E36ED" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark">Remember Me</p>
              <p className="text-xs text-muted mt-0.5">Stay signed in on this device</p>
            </div>
            <button
              onClick={() => setRememberMe((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${rememberMe ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${rememberMe ? "translate-x-6" : "translate-x-0.5"}`}
              />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
