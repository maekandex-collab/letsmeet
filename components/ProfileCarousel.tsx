"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

interface ProfileCarouselProps {
  children: ReactNode;
  /** Label for screen readers, e.g. "Liked you profiles" */
  label: string;
}

export default function ProfileCarousel({ children, label }: ProfileCarouselProps) {
  const slides = Children.toArray(children);
  const slideCount = slides.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const updateActive = useCallback(() => {
    const track = trackRef.current;
    if (!track || slideCount === 0) return;

    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;

    for (let i = 0; i < track.children.length; i++) {
      const slide = track.children[i] as HTMLElement;
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(center - slideCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    setActive(closest);
  }, [slideCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateActive();
    track.addEventListener("scroll", updateActive, { passive: true });
    return () => track.removeEventListener("scroll", updateActive);
  }, [updateActive, slideCount]);

  const scrollTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  if (slideCount === 0) return null;

  const canPrev = active > 0;
  const canNext = active < slideCount - 1;

  return (
    <div className="relative">
      {slideCount > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollTo(active - 1)}
            disabled={!canPrev}
            className={`absolute left-2 top-[42%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 shadow-card flex items-center justify-center transition-opacity ${
              canPrev ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#12151C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollTo(active + 1)}
            disabled={!canNext}
            className={`absolute right-2 top-[42%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 shadow-card flex items-center justify-center transition-opacity ${
              canNext ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="#12151C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-[12%] pb-2"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {Children.map(children, (child, i) => {
          const keyedChild =
            isValidElement(child) && child.key == null
              ? cloneElement(child as ReactElement, { key: i })
              : child;

          return (
            <div
              key={isValidElement(keyedChild) ? keyedChild.key : i}
              className={`snap-center shrink-0 w-[76%] transition-all duration-300 ease-out ${
                i === active ? "scale-100 opacity-100" : "scale-[0.94] opacity-85"
              }`}
              style={{ aspectRatio: "3/4" }}
            >
              {keyedChild}
            </div>
          );
        })}
      </div>

      {slideCount > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3 px-5">
          {slides.map((slide, i) => (
            <button
              key={isValidElement(slide) ? slide.key ?? i : i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-5 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
