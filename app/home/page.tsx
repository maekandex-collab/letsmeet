"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProfilePhoto from "@/components/ProfilePhoto";
import {
  swipeProfile,
  prefetchMedia,
  isLoggedIn,
  readFeedSnapshot,
  writeFeedSnapshot,
  markSwipedCard,
  swipeTargetId,
  extractError,
  clearFeedSnapshot,
  resetDiscoverLocalState,
  fetchDiscoverFeed,
  linkMatchRoomIds,
  extractRoomIdFromMatchResponse,
  type ProfileCard,
} from "@/lib/letsmeet";

export default function HomePage() {
  const router = useRouter();
  const [cards, setCards] = useState<ProfileCard[]>([]);
  const [direction, setDirection] = useState<null | "left" | "right">(null);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swipeError, setSwipeError] = useState("");
  const [feedError, setFeedError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/sign-in");
      setLoading(false);
      return;
    }

    const snapshot = readFeedSnapshot();
    const needsRefresh =
      typeof window !== "undefined" && sessionStorage.getItem("lm_feed_refresh");
    if (needsRefresh) {
      sessionStorage.removeItem("lm_feed_refresh");
      clearFeedSnapshot();
    } else if (snapshot) {
      setCards(snapshot.cards);
      setLoading(false);
      prefetchMedia(snapshot.cards.map((c) => c.profile_photo), 12, 3);
      return;
    }

    (async () => {
      try {
        const result = await fetchDiscoverFeed();
        if (!result.ok) {
          setFeedError(result.error ?? "Could not load profiles. Try again.");
          return;
        }
        if (result.notice) setFeedError(result.notice);
        else setFeedError("");
        setCards(result.cards);
        if (result.cards.length > 0) {
          writeFeedSnapshot(result.cards, 0);
          prefetchMedia(result.cards.map((c) => c.profile_photo), 12, 3);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function handleClearFilters() {
    resetDiscoverLocalState();
    clearFeedSnapshot();
    setFeedError("");
    setCards([]);
    setLoading(true);
    void fetchDiscoverFeed().then((result) => {
      setLoading(false);
      if (!result.ok) {
        setFeedError(result.error ?? "Could not load profiles.");
        return;
      }
      if (result.notice) setFeedError(result.notice);
      setCards(result.cards);
      if (result.cards.length > 0) writeFeedSnapshot(result.cards, 0);
      else if (!result.notice) {
        setFeedError("No profiles available right now — the backend feed may be empty.");
      }
    });
  }

  useEffect(() => {
    if (cards.length > 0) {
      writeFeedSnapshot(cards, 0);
    }
  }, [cards]);

  async function handleSwipe(dir: "left" | "right") {
    if (animating || cards.length === 0) return;
    const card = cards[0];
    setDirection(dir);
    setAnimating(true);
    setSwipeError("");

    const type = dir === "right" ? "like" : "pass";

    try {
      const res = await swipeProfile(card, type);
      const accepted = res.ok || res.status === 400;

      if (!accepted) {
        setSwipeError(extractError(res.data, "Could not save your swipe. Try again."));
        setDirection(null);
        setAnimating(false);
        return;
      }

      markSwipedCard(card);

      if (dir === "right" && res.ok && res.data?.matched) {
        const roomId = extractRoomIdFromMatchResponse(res.data);
        if (roomId != null) {
          linkMatchRoomIds(roomId, [res.data.chatroom_id, card.chatroom_id, card.id]);
        }
        setCards((prev) => prev.filter((c) => swipeTargetId(c) !== swipeTargetId(card)));
        router.push("/match-found");
        return;
      }

      setTimeout(() => {
        setCards((prev) => prev.filter((c) => swipeTargetId(c) !== swipeTargetId(card)));
        setDirection(null);
        setAnimating(false);
      }, 420);
    } catch {
      setSwipeError("Network error. Your swipe was not saved.");
      setDirection(null);
      setAnimating(false);
    }
  }

  return (
    <div className="mobile-shell flex flex-col bg-white overflow-hidden" style={{ height: "100dvh" }}>
      <LogoHeader
        right={
          <Link href="/filter" className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-light">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </Link>
        }
      />

      <div className="flex flex-col px-3 sm:px-4 pt-header pb-bottom-nav h-dvh">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-dark">Discover</h2>
            <p className="text-xs text-muted mt-0.5">Find your perfect match</p>
          </div>
          {cards.length > 0 && (
            <span className="text-xs font-semibold text-muted">{cards.length} nearby</span>
          )}
        </div>

        {feedError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
            {feedError}
          </p>
        )}

        {swipeError && (
          <p className="text-xs text-red-500 mb-2 px-1">{swipeError}</p>
        )}

        <div
          className="relative mx-auto w-full max-w-[430px] shrink-0"
          style={{ height: "clamp(340px, 56dvh, 520px)" }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted text-sm">Finding people near you…</p>
            </div>
          )}

          {!loading && cards.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mb-4">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#F759F5" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-1">No more profiles</h3>
              <p className="text-sm text-muted mb-4">Check back later for new people to meet.</p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Link href="/filter" className="btn-secondary text-center text-sm py-2.5">
                  Adjust filters
                </Link>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-sm font-semibold text-primary"
                >
                  Reset filters &amp; refresh
                </button>
              </div>
            </div>
          )}

          {!loading &&
            cards.slice(0, 3).map((card, idx) => {
              const isTop = idx === 0;
              const isMid = idx === 1;

              let transform = "";
              let transition = "";
              const zIndex = 3 - idx;

              if (isTop) {
                if (direction === "right") transform = "translateX(160%) rotate(28deg)";
                else if (direction === "left") transform = "translateX(-160%) rotate(-28deg)";
                else transform = "translateX(0) rotate(0deg) scale(1)";
                transition = direction
                  ? "transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94)"
                  : "transform 0.3s ease";
              } else if (isMid) {
                transform = animating ? "scale(0.97) translateY(8px)" : "scale(0.93) translateY(16px)";
                transition = "transform 0.42s ease";
              } else {
                transform = animating ? "scale(0.93) translateY(16px)" : "scale(0.87) translateY(30px)";
                transition = "transform 0.42s ease";
              }

              const photo = card.profile_photo;

              return (
                <div
                  key={swipeTargetId(card)}
                  className="absolute inset-x-0 inset-y-0"
                  style={{ transform, transition, zIndex, willChange: "transform" }}
                >
                  <div className="relative rounded-[28px] overflow-hidden h-full bg-[#151515]" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                    <ProfilePhoto
                      photo={photo}
                      alt={card.name}
                      priority={isTop}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                    {isTop && direction === "right" && (
                      <div className="absolute top-10 left-6 px-4 py-2 rounded-xl border-[3px] border-green-400 -rotate-12">
                        <span className="text-green-400 font-black text-2xl tracking-wider">LIKE</span>
                      </div>
                    )}
                    {isTop && direction === "left" && (
                      <div className="absolute top-10 right-6 px-4 py-2 rounded-xl border-[3px] border-red-400 rotate-12">
                        <span className="text-red-400 font-black text-2xl tracking-wider">NOPE</span>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
                      <div className="flex items-end justify-between">
                        <div>
                          <h2 className="text-[1.55rem] font-bold text-white leading-tight">
                            {card.name}{card.age ? `, ${card.age}` : ""}
                          </h2>
                          {card.location && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.75)">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                              </svg>
                              <span className="text-white/75 text-sm">{card.location}</span>
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/profile-single?id=${encodeURIComponent(card.user_id)}&uid=${encodeURIComponent(swipeTargetId(card))}&source=discover`}
                          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                            <path d="M12 16v-5M12 8v-.01" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {!loading && cards.length > 0 && (
          <div className="flex items-center justify-center gap-5 mt-4 shrink-0">
            <button
              onClick={() => handleSwipe("left")}
              disabled={animating}
              className="w-14 h-14 rounded-full border-2 border-border bg-white shadow-card flex items-center justify-center active:scale-90 transition-transform disabled:opacity-60"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#F75959" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            <button
              onClick={() => handleSwipe("right")}
              disabled={animating}
              className="w-[68px] h-[68px] rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-60"
              style={{ boxShadow: "0 8px 24px rgba(247,89,245,0.45)" }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="white" />
              </svg>
            </button>

            <Link
              href={cards[0] ? `/profile-single?id=${encodeURIComponent(cards[0].user_id)}&uid=${encodeURIComponent(swipeTargetId(cards[0]))}&source=discover` : "/home"}
              className="w-14 h-14 rounded-full border-2 border-border bg-white shadow-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#12151C" strokeWidth="2"/>
                <path d="M12 16v-5M12 8v-.01" stroke="#12151C" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

