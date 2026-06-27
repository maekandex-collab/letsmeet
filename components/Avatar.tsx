"use client";

import { useMediaDisplay } from "@/lib/useMediaDisplay";

const SIZES = {
  sm: "w-10 h-10 text-xs",
  md: "w-14 h-14 text-sm",
  lg: "w-20 h-20 text-base",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function placeholderHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

interface AvatarProps {
  photo?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  fill?: boolean;
  priority?: boolean;
  className?: string;
}

export default function Avatar({
  photo,
  name,
  size = "md",
  fill = false,
  priority = false,
  className = "",
}: AvatarProps) {
  const { src, loaded, failed, onLoad, onError, bindImg } = useMediaDisplay(photo);

  const label = initials(name || "?");
  const hue = placeholderHue(name || "user");
  const gradient = `linear-gradient(135deg, hsl(${hue} 72% 62%), hsl(${(hue + 40) % 360} 68% 48%))`;
  const sizeClass = fill ? "absolute inset-0 w-full h-full text-lg" : SIZES[size];
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${fill ? "" : "shrink-0 rounded-full"} ${sizeClass} ${fill ? "" : "rounded-full"} ${className}`}
      style={{ background: gradient }}
    >
      <span
        className={`font-bold text-white drop-shadow-sm select-none z-0 ${
          showImage && loaded ? "opacity-0" : "opacity-100"
        } transition-opacity duration-200`}
        aria-hidden="true"
      >
        {label}
      </span>

      {showImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={src}
          ref={bindImg}
          src={src}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={onLoad}
          onError={onError}
          className={`absolute inset-0 w-full h-full object-cover object-center z-10 transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}
