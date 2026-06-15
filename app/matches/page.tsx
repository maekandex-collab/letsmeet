"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import {
  getMatchedList,
  getLikeList,
  mediaUrl,
  type ProfileCard,
} from "@/lib/letsmeet";

function normalize(data: ProfileCard[] | ProfileCard | null | undefined): ProfileCard[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function Avatar({ photo, name }: { photo: string | null; name: string }) {
  const url = mediaUrl(photo);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="absolute inset-0 w-full h-full object-cover object-top" />;
  }
  return (
    <div className="absolute inset-0 bg-primary-light flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
        <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<ProfileCard[]>([]);
  const [likes, setLikes] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, l] = await Promise.all([getMatchedList(), getLikeList()]);
      if (m.ok) setMatches(normalize(m.data));
      if (l.ok && Array.isArray(l.data)) setLikes(l.data);
      setLoading(false);
    })();
  }, []);

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
        {/* Likes you (people who liked you) */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-bold text-dark">Liked You</h2>
            <span className="text-sm font-semibold text-muted">{likes.length}</span>
          </div>

          {loading ? (
            <p className="px-5 text-sm text-muted">Loading…</p>
          ) : likes.length === 0 ? (
            <p className="px-5 text-sm text-muted">No likes yet. Keep swiping!</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-1">
              {likes.map((m) => (
                <Link
                  key={m.user_id}
                  href={`/profile-single?id=${encodeURIComponent(m.user_id)}&uid=${m.id}`}
                  className="shrink-0 relative rounded-[22px] overflow-hidden"
                  style={{ width: "calc(45% - 6px)", aspectRatio: "3/4" }}
                >
                  <Avatar photo={m.profile_photo} name={m.name} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(247,89,245,0) 45%, rgba(247,89,245,0.9) 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-white font-bold text-[15px] leading-tight">{m.name}{m.age ? `, ${m.age}` : ""}</p>
                    {m.location && <p className="text-white/80 text-[11px] mt-0.5">{m.location}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Your matches */}
        <section>
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-bold text-dark">Your Matches</h2>
          </div>

          {loading ? (
            <p className="px-5 text-sm text-muted">Loading…</p>
          ) : matches.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#F759F5" strokeWidth="2" />
                </svg>
              </div>
              <p className="text-sm text-muted">No matches yet. When you and someone like each other, they&apos;ll show up here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-5">
              {matches.map((m) => (
                <Link
                  key={m.user_id}
                  href={`/chat?id=${encodeURIComponent(m.user_id)}&room=${m.id}&name=${encodeURIComponent(m.name)}`}
                  className="relative rounded-[22px] overflow-hidden"
                  style={{ aspectRatio: "3/4" }}
                >
                  <Avatar photo={m.profile_photo} name={m.name} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(62,54,237,0) 40%, #3E36ED 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-white font-bold text-[15px] mb-1 leading-tight">{m.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {m.age ? (
                        <span className="text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/40">{m.age} yr</span>
                      ) : null}
                      {m.location ? (
                        <span className="text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/40">{m.location}</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
