"use client";

import { useMediaDisplay } from "@/lib/useMediaDisplay";

interface ProfilePhotoProps {
  /** Backend media path, e.g. /media/profile_pics/x.jpg */
  photo?: string | null;
  alt: string;
  /** Top visible card — load immediately */
  priority?: boolean;
}

function Placeholder() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary-light/50 via-[#2a2030] to-[#151515] flex items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" className="opacity-40">
        <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
        <path
          d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20"
          stroke="#F759F5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function ProfilePhoto({ photo, alt, priority = false }: ProfilePhotoProps) {
  const { src, loaded, failed, onLoad, onError, bindImg, hasPhoto } = useMediaDisplay(photo);

  if (!hasPhoto || !src || failed) return <Placeholder />;

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/40 via-[#252525] to-[#151515] animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        ref={bindImg}
        src={src}
        alt={alt}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={onLoad}
        onError={onError}
        className={`absolute inset-0 w-full h-full object-contain object-center transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
