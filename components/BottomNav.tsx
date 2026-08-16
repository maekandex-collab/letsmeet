"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTotalUnread } from "@/lib/useInboxUnread";
import UnreadBadge from "@/components/UnreadBadge";
import { motion, useReducedMotion } from "@/lib/motion";

const tabs = [
  {
    href: "/home",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
          stroke={active ? "#F759F5" : "#616568"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? "#F759F5" : "none"}
          fillOpacity={active ? "0.18" : "0"}
        />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Message",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
          stroke={active ? "#F759F5" : "#616568"}
          strokeWidth="2"
          fill={active ? "#F759F5" : "none"}
          fillOpacity={active ? "0.18" : "0"}
        />
      </svg>
    ),
  },
  {
    href: "/matches",
    label: "Match",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          stroke={active ? "#F759F5" : "#616568"}
          strokeWidth="2"
          fill={active ? "#F759F5" : "none"}
          fillOpacity={active ? "0.2" : "0"}
        />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Notification",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
          stroke={active ? "#F759F5" : "#616568"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? "#F759F5" : "none"}
          fillOpacity={active ? "0.15" : "0"}
        />
        <path
          d="M13.73 21a2 2 0 0 1-3.46 0"
          stroke={active ? "#F759F5" : "#616568"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="8"
          r="4"
          stroke={active ? "#F759F5" : "#616568"}
          strokeWidth="2"
          fill={active ? "#F759F5" : "none"}
          fillOpacity={active ? "0.2" : "0"}
        />
        <path
          d="M4 20C4 17.7909 7.58172 16 12 16C16.4183 16 20 17.7909 20 20"
          stroke={active ? "#F759F5" : "#616568"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const totalUnread = useTotalUnread();
  const reduce = useReducedMotion();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile z-50 px-3 pb-safe pointer-events-none">
      <div className="pointer-events-auto mb-2 rounded-[28px] border border-primary/10 bg-white/92 backdrop-blur-xl shadow-nav px-1.5 py-1.5">
        <div className="flex items-center relative">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
            const showBadge = tab.href === "/messages" && totalUnread > 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] rounded-2xl text-[10px] font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                {active && !reduce && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-1 rounded-2xl bg-gradient-to-b from-primary-light to-white border border-primary/15 shadow-soft"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {active && reduce && (
                  <span className="absolute inset-1 rounded-2xl bg-gradient-to-b from-primary-light to-white border border-primary/15 shadow-soft" />
                )}
                <span className="relative z-[1] inline-flex">
                  <motion.span
                    animate={reduce ? undefined : { y: active ? -1 : 0, scale: active ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex"
                  >
                    {tab.icon(active)}
                  </motion.span>
                  {showBadge && <UnreadBadge count={totalUnread} dot />}
                </span>
                <span className="relative z-[1] leading-tight">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
