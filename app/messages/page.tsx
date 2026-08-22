"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ConversationRow, { ConversationRowSkeleton } from "@/components/ConversationRow";
import UnreadBadge from "@/components/UnreadBadge";
import {
  getInboxEntry,
  hydrateInboxFromApi,
  pruneInboxToRooms,
  upsertInboxPeer,
} from "@/lib/chatInbox";
import { useInboxMap, useTotalUnread } from "@/lib/useInboxUnread";
import {
  fetchMatchedListCached,
  getMessageList,
  parseApiChatMessages,
  prefetchMedia,
  chatRoomKey,
  type ProfileCard,
} from "@/lib/letsmeet";
import { PageEnter, StaggerItem, StaggerList } from "@/lib/motion";

const PREVIEW_HYDRATE_LIMIT = 8;

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
    const list = await fetchMatchedListCached();
    setMatches(list);
    pruneInboxToRooms(list.map((m) => inboxKeyForMatch(m)));
    prefetchMedia(list.map((c) => c.profile_photo));
    for (const m of list) {
      upsertInboxPeer(inboxKeyForMatch(m), {
        userId: m.user_id,
        name: m.name,
        photo: m.profile_photo,
      });
    }
    return list;
  }, []);

  const hydratePreviews = useCallback(async (list: ProfileCard[]) => {
    if (list.length === 0) return;
    const priority = list.slice(0, PREVIEW_HYDRATE_LIMIT);
    const rest = list.slice(PREVIEW_HYDRATE_LIMIT);
    const fetchPage = async (roomId: string | number) => {
      const res = await getMessageList(roomId, 1);
      if (!res.ok) return [];
      return parseApiChatMessages(res.data);
    };

    setHydrating(true);
    await hydrateInboxFromApi(
      priority.map((m) => chatRoomKey(m)),
      fetchPage,
      4
    );
    setHydrating(false);

    if (rest.length > 0) {
      void hydrateInboxFromApi(
        rest.map((m) => chatRoomKey(m)),
        fetchPage,
        2
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadMatches();
      if (cancelled) return;
      setLoading(false);
      void hydratePreviews(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMatches, hydratePreviews]);

  useEffect(() => {
    if (pathname !== "/messages") return;
    setAvatarEpoch((n) => n + 1);
    window.dispatchEvent(new Event("lm-inbox-change"));
  }, [pathname]);

  const filtered = useMemo(
    () =>
      matches
        .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
          const aKey = inboxKeyForMatch(a);
          const bKey = inboxKeyForMatch(b);
          const aAt = inboxMap[aKey]?.lastAt ?? getInboxEntry(aKey)?.lastAt ?? 0;
          const bAt = inboxMap[bKey]?.lastAt ?? getInboxEntry(bKey)?.lastAt ?? 0;
          return bAt - aAt;
        }),
    [matches, query, inboxMap]
  );

  const totalUnreadDisplay = totalUnread;

  return (
    <div className="mobile-shell flex flex-col min-h-dvh">
      <LogoHeader />
      <PageEnter className="flex-1 overflow-y-auto pt-header pb-bottom-nav">
        <div className="px-5 pt-2 pb-1 flex items-center justify-between">
          <div>
            <p className="section-kicker mb-1">Inbox</p>
            <h1 className="text-2xl font-bold text-dark">Messages</h1>
            {totalUnreadDisplay > 0 && (
              <p className="text-sm text-primary font-semibold mt-0.5">
                {totalUnreadDisplay} unread
              </p>
            )}
          </div>
          <UnreadBadge count={totalUnreadDisplay} />
        </div>

        <div className="px-5 py-3 sticky top-[var(--header-h)] z-10 bg-surface/80 backdrop-blur-xl">
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
              className="w-full h-12 pl-11 pr-4 rounded-[24px] bg-white border border-primary/10 text-sm font-medium text-dark placeholder-muted shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/25"
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
          <div className="px-5 py-14 text-center">
            <div className="w-20 h-20 rounded-[28px] bg-white border border-primary/10 shadow-card flex items-center justify-center mx-auto mb-4">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="#F759F5"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-dark mb-1">
              {query ? "No matches found" : "No conversations yet"}
            </h3>
            <p className="text-sm text-muted max-w-xs mx-auto">
              {query
                ? "No conversations match your search."
                : "Match with someone to start chatting!"}
            </p>
          </div>
        ) : (
          <StaggerList className="mt-1 pb-4">
            {hydrating && (
              <p className="text-xs text-muted text-center py-2">Updating conversations…</p>
            )}
            {filtered.map((c) => {
              const key = inboxKeyForMatch(c);
              return (
                <StaggerItem key={`${c.user_id}-${avatarEpoch}`}>
                  <ConversationRow
                    match={c}
                    inbox={inboxMap[key] ?? getInboxEntry(key)}
                  />
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </PageEnter>

      <BottomNav />
    </div>
  );
}
