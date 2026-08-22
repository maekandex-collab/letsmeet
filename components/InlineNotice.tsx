"use client";

import type { ReactNode } from "react";

type InlineNoticeTone = "info" | "error";

const toneStyles: Record<
  InlineNoticeTone,
  { wrap: string; icon: string; label: string }
> = {
  info: {
    wrap:
      "bg-gradient-to-br from-[#FFF6FE] via-white to-[#F4F2FF] border border-primary/12 text-dark shadow-[0_4px_20px_rgba(247,89,245,0.08)]",
    icon: "text-primary",
    label: "text-primary/80",
  },
  error: {
    wrap:
      "bg-gradient-to-br from-rose-50 via-white to-[#FFF6FE] border border-rose-200/70 text-rose-900 shadow-[0_4px_16px_rgba(244,63,94,0.08)]",
    icon: "text-rose-500",
    label: "text-rose-600/90",
  },
};

function NoticeIcon({ tone }: { tone: InlineNoticeTone }) {
  if (tone === "error") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function InlineNotice({
  children,
  tone = "info",
  kicker,
  className = "",
}: {
  children: ReactNode;
  tone?: InlineNoticeTone;
  kicker?: string;
  className?: string;
}) {
  const s = toneStyles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-2.5 rounded-2xl px-3.5 py-2.5 mb-2.5 ${s.wrap} ${className}`}
    >
      <span className={`mt-0.5 shrink-0 ${s.icon}`}>
        <NoticeIcon tone={tone} />
      </span>
      <div className="min-w-0 flex-1">
        {kicker && (
          <p className={`text-[10px] font-bold uppercase tracking-[0.14em] mb-0.5 ${s.label}`}>
            {kicker}
          </p>
        )}
        <p className="text-[13px] leading-snug text-dark/85">{children}</p>
      </div>
    </div>
  );
}
