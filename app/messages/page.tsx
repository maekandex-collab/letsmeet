import Link from "next/link";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const conversations = [
  { id: 1, name: "Sophiya Calzoni", msg: "Hey! How are you doing?", time: "2:45 PM", unread: 2, bg: "#E8D5F5", online: true },
  { id: 2, name: "Isabella Uzo", msg: "That sounds so fun!", time: "1:30 PM", unread: 0, bg: "#D5E8F5", online: true },
  { id: 3, name: "Elizabeth Maria", msg: "Let me know when you're free", time: "12:00 PM", unread: 5, bg: "#F5E8D5", online: false },
  { id: 4, name: "Tina Schaefer", msg: "I love hiking too 🏔️", time: "11:15 AM", unread: 0, bg: "#D5F5E8", online: true },
  { id: 5, name: "Maria Panola", msg: "Thanks for the recommendation!", time: "10:00 AM", unread: 0, bg: "#F5D5E8", online: false },
  { id: 6, name: "Janet Wilson", msg: "See you there!", time: "Yesterday", unread: 0, bg: "#E8D5D5", online: false },
];

export default function MessagesPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <LogoHeader />
      <div className="flex-1 overflow-y-auto pt-20 pb-28">
        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#616568" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search messages..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-border text-sm font-medium text-dark placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex flex-col">
          {conversations.map((c) => (
            <Link key={c.id} href="/chat" className="flex items-center gap-4 px-5 py-4 hover:bg-border/40 transition-colors border-b border-border last:border-b-0">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: c.bg }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                    <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                {c.online && (
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-dark truncate">{c.name}</p>
                  <p className="text-xs text-muted ml-2 flex-shrink-0">{c.time}</p>
                </div>
                <p className="text-sm text-muted truncate mt-0.5">{c.msg}</p>
              </div>
              {c.unread > 0 && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
