import Link from "next/link";
import Avatar from "@/components/Avatar";
import UnreadBadge from "@/components/UnreadBadge";
import { formatRelativeTime, type ChatInboxEntry } from "@/lib/chatInbox";
import { buildChatHref, stashChatPeer, type ProfileCard } from "@/lib/letsmeet";

interface ConversationRowProps {
  match: ProfileCard;
  inbox?: ChatInboxEntry | null;
}

export default function ConversationRow({ match, inbox }: ConversationRowProps) {
  const unread = inbox?.unreadCount ?? 0;
  const lastText =
    inbox?.lastText ||
    (match.location && match.location.toLowerCase() !== "string"
      ? match.location
      : "Tap to start chatting");
  const lastAt = inbox?.lastAt ?? 0;

  return (
    <Link
      href={buildChatHref(match)}
      onClick={() => stashChatPeer(match)}
      className={`flex items-center gap-3 mx-4 mb-2.5 px-4 py-3.5 rounded-[24px] border transition-all pressable ${
        unread > 0
          ? "bg-gradient-to-r from-primary-light/80 to-white border-primary/20 shadow-soft"
          : "bg-white/95 border-white shadow-card hover:border-primary/10"
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar photo={match.profile_photo} name={match.name} size="md" priority />
        {unread > 0 && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-base truncate ${unread > 0 ? "font-bold text-dark" : "font-semibold text-dark"}`}
          >
            {match.name}
          </p>
          {lastAt > 0 && (
            <span className={`text-[11px] flex-shrink-0 ${unread > 0 ? "text-primary font-bold" : "text-muted"}`}>
              {formatRelativeTime(lastAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-sm truncate ${unread > 0 ? "text-dark font-medium" : "text-muted"}`}>
            {lastText}
          </p>
          <UnreadBadge count={unread} />
        </div>
      </div>
    </Link>
  );
}

export function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 mx-4 mb-2.5 px-4 py-3.5 rounded-[24px] bg-white/90 border border-white shadow-card overflow-hidden">
      <div className="w-14 h-14 rounded-full skeleton-shimmer flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded-full skeleton-shimmer w-1/3" />
        <div className="h-3 rounded-full skeleton-shimmer w-2/3" />
      </div>
    </div>
  );
}
