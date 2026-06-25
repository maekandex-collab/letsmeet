"use client";

import { useEffect, useState } from "react";
import { getClientMediaUrl, mediaUrl, warmMediaBlob } from "@/lib/letsmeet";

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
  const [src, setSrc] = useState<string | null>(() => getClientMediaUrl(photo));
  const [loaded, setLoaded] = useState(() => {
    const hit = getClientMediaUrl(photo);
    return Boolean(hit?.startsWith("blob:"));
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);

    const cached = getClientMediaUrl(photo);
    if (cached?.startsWith("blob:")) {
      setSrc(cached);
      setLoaded(true);
      return;
    }

    setSrc(mediaUrl(photo));
    setLoaded(false);

    if (!photo) return;

    let cancelled = false;
    void warmMediaBlob(photo).then((blob) => {
      if (cancelled || !blob) return;
      setSrc(blob);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [photo]);

  if (!photo || !src || failed) return <Placeholder />;

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light/40 via-[#252525] to-[#151515] animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`absolute inset-0 w-full h-full object-contain object-center transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
