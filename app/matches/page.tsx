"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import ProfileCarousel from "@/components/ProfileCarousel";
import {
  getMatchedList,
  getLikeList,
  likeBack,
  extractError,
  prefetchMedia,
  stashChatPhoto,
  buildChatHref,
  getStashedChatRoomId,
  stashChatRoomId,
  type ProfileCard,
} from "@/lib/letsmeet";

function normalize(data: ProfileCard[] | ProfileCard | null | undefined): ProfileCard[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

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
        className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-card hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
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

function MatchCard({ profile }: { profile: ProfileCard }) {
  return (
    <Link
      href={buildChatHref({
        room:
          (profile.chatroom_id && getStashedChatRoomId(profile.chatroom_id)) ??
          profile.id,
        name: profile.name,
        id: profile.user_id,
        photo: profile.profile_photo,
        chatroomId: profile.chatroom_id,
      })}
      onClick={() => {
        stashChatPhoto(profile.id, profile.profile_photo);
        stashChatPhoto(profile.user_id, profile.profile_photo);
      }}
      className="relative block w-full h-full rounded-[26px] overflow-hidden shadow-card"
      style={{ boxShadow: "0 10px 32px rgba(62,54,237,0.22)" }}
    >
      <Avatar photo={profile.profile_photo} name={profile.name} fill priority />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(62,54,237,0) 38%, #3E36ED 100%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-5">
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
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<ProfileCard[]>([]);
  const [likes, setLikes] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<number | null>(null);
  const [likeError, setLikeError] = useState("");

  useEffect(() => {
    (async () => {
      const [m, l] = await Promise.all([getMatchedList(), getLikeList()]);
      const matchList = m.ok ? normalize(m.data) : [];
      const likeList = l.ok && Array.isArray(l.data) ? l.data : [];
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

      const chatroomId = res.data.chatroom_id ?? profile.chatroom_id;
      if (chatroomId && res.data.match_id != null) {
        stashChatRoomId(chatroomId, res.data.match_id);
      }

      setLikes((prev) => prev.filter((p) => p.user_id !== profile.user_id));

      const m = await getMatchedList();
      if (m.ok) setMatches(normalize(m.data));

      stashChatPhoto(profile.id, profile.profile_photo);
      stashChatPhoto(profile.user_id, profile.profile_photo);

      router.push("/match-found");
    } catch {
      setLikeError("Network error. Try again.");
    } finally {
      setLikingId(null);
    }
  }

  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-white">
      <LogoHeader
        right={
          <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-full">
            {matches.length} Matches
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto pt-20 pb-28">
        <section className="mb-8">
          <div className="flex items-center justify-between px-5 mb-4">
            <h2 className="text-base font-bold text-dark">Liked You</h2>
            <span className="text-sm font-semibold text-muted">{likes.length}</span>
          </div>

          {loading ? (
            <p className="px-5 text-sm text-muted">Loading…</p>
          ) : likes.length === 0 ? (
            <p className="px-5 text-sm text-muted">No likes yet. Keep swiping!</p>
          ) : (
            <>
              <p className="px-5 text-xs text-muted mb-3 -mt-1">
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
          <div className="flex items-center justify-between px-5 mb-4">
            <h2 className="text-base font-bold text-dark">Your Matches</h2>
          </div>

          {loading ? (
            <p className="px-5 text-sm text-muted">Loading…</p>
          ) : matches.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    stroke="#F759F5"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted">
                No matches yet. When you and someone like each other, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <ProfileCarousel label="Your matches">
              {matches.map((profile) => (
                <MatchCard key={profile.user_id} profile={profile} />
              ))}
            </ProfileCarousel>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
