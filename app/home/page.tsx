"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProfilePhoto from "@/components/ProfilePhoto";
import DiscoverEmptyState from "@/components/DiscoverEmptyState";
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
  type DiscoverEmptyReason,
} from "@/lib/letsmeet";

const SWIPE_THRESHOLD = 90;
const EXIT_DISTANCE = 480;
/** Ignore tiny jitter before deciding swipe vs scroll. */
const AXIS_LOCK_PX = 6;

export default function HomePage() {
  const router = useRouter();
  const [cards, setCards] = useState<ProfileCard[]>([]);
  const [direction, setDirection] = useState<null | "left" | "right">(null);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swipeError, setSwipeError] = useState("");
  const [feedError, setFeedError] = useState("");
  const [emptyReason, setEmptyReason] = useState<DiscoverEmptyReason>(null);
  const [platformUserCount, setPlatformUserCount] = useState<number | undefined>();

  // Live drag offset for the top card (pointer / touch).
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragXRef = useRef(0);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const lockAxis = useRef<"x" | "y" | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  function applyFeedResult(result: Awaited<ReturnType<typeof fetchDiscoverFeed>>) {
    if (!result.ok) {
      setFeedError(result.error ?? "Could not load profiles. Try again.");
      setEmptyReason(null);
      setPlatformUserCount(undefined);
      setCards([]);
      return;
    }

    setEmptyReason(result.emptyReason ?? null);
    setPlatformUserCount(result.platformUserCount);
    setFeedError(
      result.notice && !result.emptyReason && result.cards.length > 0 ? result.notice : ""
    );
    setCards(result.cards);

    if (result.cards.length > 0) {
      writeFeedSnapshot(result.cards, 0);
      prefetchMedia(result.cards.map((c) => c.profile_photo), 12, 3);
    }
  }

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
        applyFeedResult(result);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function handleRefreshDiscover() {
    clearFeedSnapshot();
    setFeedError("");
    setEmptyReason(null);
    setLoading(true);
    void fetchDiscoverFeed().then((result) => {
      setLoading(false);
      applyFeedResult(result);
    });
  }

  function handleClearFilters() {
    resetDiscoverLocalState();
    handleRefreshDiscover();
  }

  useEffect(() => {
    if (cards.length > 0) {
      writeFeedSnapshot(cards, 0);
    }
  }, [cards]);

  function resetDrag() {
    dragXRef.current = 0;
    setDragX(0);
    setDragging(false);
    pointerStartX.current = null;
    pointerStartY.current = null;
    lockAxis.current = null;
    pointerIdRef.current = null;
  }

  async function handleSwipe(dir: "left" | "right") {
    if (animating || cards.length === 0) return;
    const card = cards[0];
    setDirection(dir);
    setAnimating(true);
    setSwipeError("");
    resetDrag();

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

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (animating || cards.length === 0) return;
    // Ignore secondary buttons / multi-touch chaos
    if (e.button !== 0) return;
    // Don't start a drag from the info link
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button")) return;

    pointerIdRef.current = e.pointerId;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    lockAxis.current = null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some WebViews reject capture; move/up still work on the element.
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    if (pointerStartX.current == null || pointerStartY.current == null) return;
    if (animating) return;

    const dx = e.clientX - pointerStartX.current;
    const dy = e.clientY - pointerStartY.current;

    if (!lockAxis.current) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      // Discover cards are horizontal-first: bias toward X so a slight finger
      // wobble doesn't permanently lock the gesture to vertical scroll.
      lockAxis.current =
        Math.abs(dx) >= Math.abs(dy) * 0.65 ? "x" : "y";
      if (lockAxis.current === "y") return;
      setDragging(true);
    }

    if (lockAxis.current !== "x") return;

    // Stop the browser from scrolling / cancelling the gesture mid-swipe.
    e.preventDefault();
    dragXRef.current = dx;
    setDragX(dx);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const dx = dragXRef.current;
    const wasHorizontal = lockAxis.current === "x";
    resetDrag();

    if (!wasHorizontal || animating) return;

    if (dx > SWIPE_THRESHOLD) {
      void handleSwipe("right");
    } else if (dx < -SWIPE_THRESHOLD) {
      void handleSwipe("left");
    }
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    resetDrag();
  }

  function onLostPointerCapture() {
    // iOS / in-app browsers can revoke capture without a clean up event.
    if (pointerIdRef.current == null) return;
    if (animating) return;
    const dx = dragXRef.current;
    const wasHorizontal = lockAxis.current === "x";
    resetDrag();
    if (!wasHorizontal) return;
    if (dx > SWIPE_THRESHOLD) void handleSwipe("right");
    else if (dx < -SWIPE_THRESHOLD) void handleSwipe("left");
  }

  const stampOpacity = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  return (
    <div className="mobile-shell flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <LogoHeader
        right={
          <Link
            href="/filter"
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary-light/80 border border-primary/10 pressable shadow-soft"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </Link>
        }
      />

      <div className="flex flex-col px-3 sm:px-4 pt-header pb-bottom-nav h-dvh">
        <div className="flex items-center justify-between mb-3 animate-fade-up">
          <div>
            <p className="section-kicker mb-1">Discover</p>
            <h2 className="text-2xl font-bold text-dark leading-none">People near you</h2>
            <p className="text-xs text-muted mt-1.5">Swipe right to like · left to pass</p>
          </div>
          {cards.length > 0 && (
            <span className="text-[11px] font-bold text-primary bg-primary-light px-3 py-1.5 rounded-full border border-primary/15">
              {cards.length} nearby
            </span>
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
          className="relative mx-auto w-full max-w-[430px] shrink-0 overflow-hidden touch-none"
          style={{ height: "clamp(340px, 56dvh, 520px)", touchAction: "none" }}
        >
          {loading && (
            <div className="absolute inset-0 rounded-[28px] overflow-hidden border border-primary/10 bg-white shadow-card">
              <div className="h-full skeleton-shimmer" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="h-5 w-40 rounded-full bg-white/70 mb-2" />
                <div className="h-3 w-24 rounded-full bg-white/55" />
              </div>
            </div>
          )}

          {!loading && cards.length === 0 && emptyReason && (
            <DiscoverEmptyState
              reason={emptyReason}
              platformUserCount={platformUserCount}
              onRefresh={handleRefreshDiscover}
            />
          )}

          {!loading && cards.length === 0 && !emptyReason && (
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
                if (direction === "right") {
                  transform = `translateX(${EXIT_DISTANCE}px) rotate(28deg)`;
                  transition = "transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94)";
                } else if (direction === "left") {
                  transform = `translateX(-${EXIT_DISTANCE}px) rotate(-28deg)`;
                  transition = "transform 0.42s cubic-bezier(0.25,0.46,0.45,0.94)";
                } else if (dragging || dragX !== 0) {
                  const rot = dragX / 18;
                  transform = `translateX(${dragX}px) rotate(${rot}deg)`;
                  transition = dragging ? "none" : "transform 0.28s ease";
                } else {
                  transform = "translateX(0) rotate(0deg) scale(1)";
                  transition = "transform 0.3s ease";
                }
              } else if (isMid) {
                const lift = dragging && Math.abs(dragX) > 40;
                transform = animating || lift
                  ? "scale(0.97) translateY(8px)"
                  : "scale(0.93) translateY(16px)";
                transition = "transform 0.42s ease";
              } else {
                transform = animating ? "scale(0.93) translateY(16px)" : "scale(0.87) translateY(30px)";
                transition = "transform 0.42s ease";
              }

              const photo = card.profile_photo;
              const showLike =
                isTop && (direction === "right" || (dragX > 24 && !direction));
              const showNope =
                isTop && (direction === "left" || (dragX < -24 && !direction));

              return (
                <div
                  key={swipeTargetId(card)}
                  className={`absolute inset-x-0 inset-y-0 ${isTop ? "cursor-grab active:cursor-grabbing touch-none select-none" : "pointer-events-none"}`}
                  style={{
                    transform,
                    transition,
                    zIndex,
                    willChange: "transform",
                    touchAction: isTop ? "none" : undefined,
                  }}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? onPointerUp : undefined}
                  onPointerCancel={isTop ? onPointerCancel : undefined}
                  onLostPointerCapture={isTop ? onLostPointerCapture : undefined}
                >
                  <div
                    className="relative rounded-[28px] overflow-hidden h-full bg-[#151515] ring-1 ring-white/20"
                    style={{ boxShadow: "0 16px 40px rgba(62,54,237,0.18)" }}
                  >
                    <ProfilePhoto
                      photo={photo}
                      alt={card.name}
                      priority={isTop}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

                    {showLike && (
                      <div
                        className="absolute top-10 left-6 px-4 py-2 rounded-xl border-[3px] border-green-400 -rotate-12 pointer-events-none"
                        style={{ opacity: direction ? 1 : stampOpacity }}
                      >
                        <span className="text-green-400 font-black text-2xl tracking-wider">LIKE</span>
                      </div>
                    )}
                    {showNope && (
                      <div
                        className="absolute top-10 right-6 px-4 py-2 rounded-xl border-[3px] border-red-400 rotate-12 pointer-events-none"
                        style={{ opacity: direction ? 1 : stampOpacity }}
                      >
                        <span className="text-red-400 font-black text-2xl tracking-wider">NOPE</span>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-6 pointer-events-none">
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
                        {isTop && (
                          <Link
                            href={`/profile-single?id=${encodeURIComponent(card.user_id)}&uid=${encodeURIComponent(swipeTargetId(card))}&source=discover`}
                            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 pointer-events-auto"
                            onPointerDown={(e) => e.stopPropagation()}
                            aria-label={`View ${card.name}'s profile`}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                              <path d="M12 16v-5M12 8v-.01" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {!loading && cards.length > 0 && (
          <div className="flex items-center justify-center gap-8 mt-4 shrink-0">
            <button
              type="button"
              onClick={() => handleSwipe("left")}
              disabled={animating}
              aria-label="Pass"
              className="w-14 h-14 rounded-full border border-red-100 bg-white shadow-card flex items-center justify-center pressable disabled:opacity-60"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#F75959" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleSwipe("right")}
              disabled={animating}
              aria-label="Like"
              className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-primary to-[#d946ef] flex items-center justify-center pressable disabled:opacity-60"
              style={{ boxShadow: "0 12px 28px rgba(247,89,245,0.42)" }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="white" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
