"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ConversationRow, { ConversationRowSkeleton } from "@/components/ConversationRow";
import UnreadBadge from "@/components/UnreadBadge";
import {
  getInboxEntry,
  hydrateInboxFromApi,
  upsertInboxPeer,
} from "@/lib/chatInbox";
import { useInboxMap, useTotalUnread } from "@/lib/useInboxUnread";
import {
  getMatchedList,
  getMessageList,
  parseApiChatMessages,
  prefetchMedia,
  chatRoomKey,
  parseProfileCards,
  type ProfileCard,
} from "@/lib/letsmeet";

function normalize(data: ProfileCard[] | ProfileCard | null | undefined): ProfileCard[] {
  return parseProfileCards(data);
}

function inboxKeyForMatch(match: ProfileCard): string {
  return chatRoomKey(match);
}

export default function MessagesPage() {
  const pathname = usePathname();
  const [matches, setMatches] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrating, setHydrating] = useState(false);
  const [query, setQuery] = useState("");
  const [avatarEpoch, setAvatarEpoch] = useState(0);
  const inboxMap = useInboxMap();
  const totalUnread = useTotalUnread();

  const loadMatches = useCallback(async () => {
    const res = await getMatchedList();
    if (res.ok) {
      const list = normalize(res.data);
      setMatches(list);
      prefetchMedia(list.map((c) => c.profile_photo));
      for (const m of list) {
        upsertInboxPeer(inboxKeyForMatch(m), {
          userId: m.user_id,
          name: m.name,
          photo: m.profile_photo,
        });
      }
      return list;
    }
    return [];
  }, []);

  const hydratePreviews = useCallback(async (list: ProfileCard[]) => {
    if (list.length === 0) return;
    setHydrating(true);
    const roomIds = list.map((m) => chatRoomKey(m));
    await hydrateInboxFromApi(roomIds, async (roomId) => {
      const res = await getMessageList(roomId, 1);
      if (!res.ok) return [];
      return parseApiChatMessages(res.data);
    });
    setHydrating(false);
  }, []);

  useEffect(() => {
    (async () => {
      const list = await loadMatches();
      setLoading(false);
      void hydratePreviews(list);
    })();
  }, [loadMatches, hydratePreviews]);

  useEffect(() => {
    if (pathname !== "/messages") return;
    setAvatarEpoch((n) => n + 1);
    void (async () => {
      const list = await loadMatches();
      await hydratePreviews(list);
    })();
  }, [pathname, loadMatches, hydratePreviews]);

  const filtered = matches
    .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const aKey = inboxKeyForMatch(a);
      const bKey = inboxKeyForMatch(b);
      const aAt = getInboxEntry(aKey)?.lastAt ?? 0;
      const bAt = getInboxEntry(bKey)?.lastAt ?? 0;
      return bAt - aAt;
    });

  const totalUnreadDisplay = totalUnread;

  return (
    <div className="mobile-shell flex flex-col min-h-dvh">
      <LogoHeader />
      <div className="flex-1 overflow-y-auto pt-header pb-bottom-nav">
        <div className="px-5 pt-2 pb-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark">Messages</h1>
            {totalUnreadDisplay > 0 && (
              <p className="text-sm text-primary font-medium mt-0.5">
                {totalUnreadDisplay} unread
              </p>
            )}
          </div>
          <UnreadBadge count={totalUnreadDisplay} />
        </div>

        <div className="px-5 py-3 sticky top-[var(--header-h)] bg-white z-10">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#616568" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-border text-sm font-medium text-dark placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-2">
            {[1, 2, 3, 4].map((i) => (
              <ConversationRowSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="#F759F5"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm text-muted">
              {query
                ? "No conversations match your search."
                : "No conversations yet. Match with someone to start chatting!"}
            </p>
          </div>
        ) : (
          <div className="mt-1 pb-4">
            {hydrating && (
              <p className="text-xs text-muted text-center py-2">Updating conversations…</p>
            )}
            {filtered.map((c) => {
              const key = inboxKeyForMatch(c);
              return (
                <ConversationRow
                  key={`${c.user_id}-${avatarEpoch}`}
                  match={c}
                  inbox={inboxMap[key] ?? getInboxEntry(key)}
                />
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
