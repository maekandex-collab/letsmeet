"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import ProfileCarousel from "@/components/ProfileCarousel";
import {
  fetchMatchedListCached,
  invalidateMatchedListCache,
  getLikeList,
  likeBack,
  extractError,
  prefetchMedia,
  stashChatPeer,
  buildChatHref,
  linkMatchRoomIds,
  extractRoomIdFromMatchResponse,
  parseProfileCards,
  unmatchUser,
  matchIdForUnmatch,
  type ProfileCard,
} from "@/lib/letsmeet";
import { removeInboxRoom } from "@/lib/chatInbox";

function LikeCard({
  profile,
  onLikeBack,
  liking,
}: {
  profile: ProfileCard;
  onLikeBack: () => void;
  liking: boolean;
}) {
  return (
    <div
      className="relative w-full h-full rounded-[26px] overflow-hidden shadow-card"
      style={{ boxShadow: "0 10px 32px rgba(247,89,245,0.22)" }}
    >
      <Link
        href={`/profile-single?id=${encodeURIComponent(profile.user_id)}&uid=${profile.id}&source=likes`}
        className="absolute inset-0 block"
      >
        <Avatar photo={profile.profile_photo} name={profile.name} fill priority />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(247,89,245,0) 42%, rgba(247,89,245,0.92) 100%)",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-5 pr-16">
          <p className="text-white font-bold text-lg leading-tight">
            {profile.name}
            {profile.age ? `, ${profile.age}` : ""}
          </p>
          {profile.location && (
            <p className="text-white/85 text-sm mt-1">{profile.location}</p>
          )}
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Like ${profile.name} back`}
        disabled={liking}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLikeBack();
        }}
        className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center pressable disabled:opacity-60 border border-primary/10"
        style={{ boxShadow: "0 6px 20px rgba(247,89,245,0.35)" }}
      >
        {liking ? (
          <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill="#F759F5"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

function MatchCard({
  profile,
  onUnmatch,
  unmatching,
}: {
  profile: ProfileCard;
  onUnmatch: () => void;
  unmatching: boolean;
}) {
  return (
    <div
      className="relative w-full h-full rounded-[26px] overflow-hidden shadow-card"
      style={{ boxShadow: "0 10px 32px rgba(62,54,237,0.22)" }}
    >
      <Link
        href={buildChatHref(profile)}
        onClick={() => stashChatPeer(profile)}
        className="absolute inset-0 block"
      >
        <Avatar photo={profile.profile_photo} name={profile.name} fill priority />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(62,54,237,0) 38%, #3E36ED 100%)",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-14">
          <p className="text-white font-bold text-lg leading-tight mb-2">{profile.name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {profile.age ? (
              <span className="text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/45">
                {profile.age} yr
              </span>
            ) : null}
            {profile.location ? (
              <span className="text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/45">
                {profile.location}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Unmatch ${profile.name}`}
        disabled={unmatching}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnmatch();
        }}
        className="absolute bottom-3 left-3 right-3 z-10 h-10 rounded-full bg-white/95 text-red-500 text-sm font-bold flex items-center justify-center gap-2 pressable disabled:opacity-60 border border-red-100 shadow-card"
      >
        {unmatching ? (
          <span className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
        {unmatching ? "Unmatching…" : "Unmatch"}
      </button>
    </div>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<ProfileCard[]>([]);
  const [likes, setLikes] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<number | null>(null);
  const [unmatchingKey, setUnmatchingKey] = useState<string | null>(null);
  const [likeError, setLikeError] = useState("");
  const [unmatchError, setUnmatchError] = useState("");

  useEffect(() => {
    (async () => {
      const [matchList, l] = await Promise.all([
        fetchMatchedListCached(),
        getLikeList(),
      ]);
      const likeList = l.ok ? parseProfileCards(l.data) : [];
      setMatches(matchList);
      setLikes(likeList);
      prefetchMedia([...matchList, ...likeList].map((c) => c.profile_photo), 12, 4);
      setLoading(false);
    })();
  }, []);

  async function handleLikeBack(profile: ProfileCard) {
    if (likingId != null) return;
    setLikeError("");
    setLikingId(profile.id);

    try {
      const res = await likeBack(profile);
      if (!res.ok || !res.data?.matched) {
        setLikeError(extractError(res.data, "Could not match right now."));
        return;
      }

      const roomId = extractRoomIdFromMatchResponse(res.data);
      if (roomId != null) {
        linkMatchRoomIds(roomId, [
          res.data.chatroom_id,
          profile.chatroom_id,
          profile.id,
        ]);
      }

      setLikes((prev) => prev.filter((p) => p.user_id !== profile.user_id));

      invalidateMatchedListCache();
      const refreshed = await fetchMatchedListCached({ fresh: true });
      setMatches(refreshed);

      stashChatPeer(profile);

      router.push("/match-found");
    } catch {
      setLikeError("Network error. Try again.");
    } finally {
      setLikingId(null);
    }
  }

  async function handleUnmatch(profile: ProfileCard) {
    const matchId = matchIdForUnmatch(profile);
    if (!matchId || unmatchingKey) return;

    const ok = window.confirm(
      `Unmatch ${profile.name}? You won’t see each other in matches anymore.`
    );
    if (!ok) return;

    setUnmatchError("");
    setUnmatchingKey(profile.user_id || matchId);

    try {
      const res = await unmatchUser(matchId);
      if (!res.ok) {
        setUnmatchError(extractError(res.data, "Could not unmatch right now."));
        return;
      }

      invalidateMatchedListCache();
      setMatches((prev) =>
        prev.filter(
          (p) =>
            p.user_id !== profile.user_id &&
            matchIdForUnmatch(p) !== matchId
        )
      );

      try {
        const roomKey = profile.chatroom_id ?? profile.room_id ?? "";
        if (roomKey !== "") {
          localStorage.removeItem(`lm_chat_${roomKey}`);
        }
      } catch {
        // ignore
      }

      if (profile.chatroom_id) removeInboxRoom(profile.chatroom_id);
      if (profile.room_id != null) removeInboxRoom(profile.room_id);
    } catch {
      setUnmatchError("Network error. Try again.");
    } finally {
      setUnmatchingKey(null);
    }
  }

  return (
    <div className="mobile-shell flex flex-col min-h-dvh">
      <LogoHeader
        right={
          <span className="text-xs font-bold text-white bg-gradient-to-r from-primary to-[#d946ef] px-3.5 py-1.5 rounded-full shadow-soft">
            {matches.length} Matches
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto pt-header pb-bottom-nav">
        <div className="px-5 pt-2 pb-4">
          <p className="section-kicker mb-1">Connections</p>
          <h1 className="text-2xl font-bold text-dark">Your matches</h1>
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between px-5 mb-3">
            <div>
              <h2 className="text-base font-bold text-dark">Liked You</h2>
              <p className="text-xs text-muted mt-0.5">People waiting for a like back</p>
            </div>
            <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full">
              {likes.length}
            </span>
          </div>

          {loading ? (
            <div className="px-5 flex gap-3 overflow-hidden">
              {[1, 2].map((i) => (
                <div key={i} className="w-56 h-72 rounded-[26px] skeleton-shimmer shrink-0" />
              ))}
            </div>
          ) : likes.length === 0 ? (
            <div className="mx-5 rounded-3xl bg-white/90 border border-white shadow-card px-4 py-5 text-sm text-muted">
              No likes yet. Keep swiping!
            </div>
          ) : (
            <>
              <p className="px-5 text-xs text-muted mb-3">
                Tap the heart to match instantly, or open a profile for details.
              </p>
              {likeError && (
                <p className="px-5 text-xs text-red-500 mb-2">{likeError}</p>
              )}
              <ProfileCarousel label="People who liked you">
                {likes.map((profile) => (
                  <LikeCard
                    key={profile.user_id}
                    profile={profile}
                    liking={likingId === profile.id}
                    onLikeBack={() => void handleLikeBack(profile)}
                  />
                ))}
              </ProfileCarousel>
            </>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between px-5 mb-3">
            <div>
              <h2 className="text-base font-bold text-dark">Your Matches</h2>
              <p className="text-xs text-muted mt-0.5">Start a chat or unmatch anytime</p>
            </div>
          </div>

          {loading ? (
            <div className="px-5 flex gap-3 overflow-hidden">
              {[1, 2].map((i) => (
                <div key={i} className="w-56 h-72 rounded-[26px] skeleton-shimmer shrink-0" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-20 h-20 rounded-[28px] bg-white border border-primary/10 shadow-card flex items-center justify-center mx-auto mb-4">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    stroke="#F759F5"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-1">No matches yet</h3>
              <p className="text-sm text-muted max-w-xs mx-auto">
                When you and someone like each other, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <>
              {unmatchError ? (
                <p className="px-5 text-xs text-red-500 mb-2">{unmatchError}</p>
              ) : null}
              <ProfileCarousel label="Your matches">
                {matches.map((profile) => (
                  <MatchCard
                    key={profile.user_id}
                    profile={profile}
                    unmatching={unmatchingKey === (profile.user_id || matchIdForUnmatch(profile))}
                    onUnmatch={() => void handleUnmatch(profile)}
                  />
                ))}
              </ProfileCarousel>
            </>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
