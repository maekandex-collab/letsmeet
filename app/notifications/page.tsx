import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const NOTIFS = [
  {
    id: 1,
    type: "match",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Sophiya Calzoni",
    text: "You and Sophiya matched! Say hello 👋",
    time: "2m ago",
    unread: true,
  },
  {
    id: 2,
    type: "like",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "Isabella Uzo",
    text: "Isabella liked your profile ❤️",
    time: "15m ago",
    unread: true,
  },
  {
    id: 3,
    type: "message",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
    name: "Elizabeth Maria",
    text: "Elizabeth sent you a message",
    time: "1h ago",
    unread: true,
  },
  {
    id: 4,
    type: "like",
    avatar: "https://randomuser.me/api/portraits/women/29.jpg",
    name: "Tina Schaefer",
    text: "Tina liked your profile ❤️",
    time: "3h ago",
    unread: false,
  },
  {
    id: 5,
    type: "match",
    avatar: "https://randomuser.me/api/portraits/women/55.jpg",
    name: "Maria Panola",
    text: "You and Maria matched! Start the conversation",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 6,
    type: "message",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg",
    name: "Sarah Johnson",
    text: "Sarah: Hey there! How are you?",
    time: "Yesterday",
    unread: false,
  },
  {
    id: 7,
    type: "like",
    avatar: "https://randomuser.me/api/portraits/women/76.jpg",
    name: "Olivia Chen",
    text: "Olivia liked your profile ❤️",
    time: "2 days ago",
    unread: false,
  },
];

const iconMap: Record<string, { bg: string; svg: React.ReactNode }> = {
  match: {
    bg: "bg-primary",
    svg: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  like: {
    bg: "bg-rose-500",
    svg: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  message: {
    bg: "bg-accent",
    svg: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" fill="white" />
      </svg>
    ),
  },
};

export default function NotificationsPage() {
  const unreadCount = NOTIFS.filter((n) => n.unread).length;

  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-white">
      <LogoHeader
        right={
          unreadCount > 0 ? (
            <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full">
              {unreadCount} new
            </span>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto pt-20 pb-28">
        {/* Section: New */}
        {NOTIFS.some((n) => n.unread) && (
          <div>
            <p className="px-5 pt-4 pb-2 text-xs font-bold text-muted uppercase tracking-wider">New</p>
            {NOTIFS.filter((n) => n.unread).map((n) => (
              <NotifRow key={n.id} n={n} />
            ))}
          </div>
        )}

        {/* Section: Earlier */}
        {NOTIFS.some((n) => !n.unread) && (
          <div>
            <p className="px-5 pt-5 pb-2 text-xs font-bold text-muted uppercase tracking-wider">Earlier</p>
            {NOTIFS.filter((n) => !n.unread).map((n) => (
              <NotifRow key={n.id} n={n} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function NotifRow({ n }: { n: typeof NOTIFS[0] }) {
  const icon = iconMap[n.type];
  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 ${n.unread ? "bg-primary-light/40" : ""}`}>
      {/* Avatar + badge */}
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={n.avatar} alt={n.name} className="w-14 h-14 rounded-full object-cover" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${icon.bg} flex items-center justify-center border-2 border-white`}>
          {icon.svg}
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${n.unread ? "font-semibold text-dark" : "font-medium text-dark/80"}`}>
          {n.text}
        </p>
        <p className="text-xs text-muted mt-0.5">{n.time}</p>
      </div>

      {/* Unread dot */}
      {n.unread && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />}
    </div>
  );
}
