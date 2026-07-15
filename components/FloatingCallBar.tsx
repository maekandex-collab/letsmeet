"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useActiveCall } from "@/lib/ActiveCallContext";

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FloatingCallBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { inCall, roomId, peerName, callSeconds, endCall, localStream, remoteStream, audioOnly, pipVideoRef } = useActiveCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pipAttempted = useRef(false);

  const isOnCallPage = pathname.startsWith("/video-call");
  const shouldShow = inCall && !isOnCallPage;

  // Attach local stream to the mini thumbnail
  useEffect(() => {
    if (shouldShow && localVideoRef.current && localStream && !audioOnly) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [shouldShow, localStream, audioOnly]);

  // Trigger browser PiP when navigating away from call page
  useEffect(() => {
    if (!shouldShow || audioOnly) {
      pipAttempted.current = false;
      return;
    }
    if (pipAttempted.current) return;
    pipAttempted.current = true;

    const videoEl = pipVideoRef.current;
    if (!videoEl || !remoteStream) return;

    videoEl.srcObject = remoteStream;
    void videoEl.play().catch(() => {});

    const tryPip = async () => {
      try {
        if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
          await videoEl.requestPictureInPicture();
        }
      } catch {}
    };

    // Small delay to ensure video is playing before PiP request
    const timer = setTimeout(tryPip, 500);
    return () => clearTimeout(timer);
  }, [shouldShow, audioOnly, remoteStream, pipVideoRef]);

  if (!shouldShow) return null;

  const callHref = `/video-call/${roomId}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] animate-slideDown">
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-[#1a2030]/95 backdrop-blur-md border-b border-white/10 shadow-lg cursor-pointer"
        onClick={() => router.push(callHref)}
      >
        {/* Local video thumbnail */}
        {!audioOnly && (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-9 h-9 rounded-full object-cover bg-[#2a2a40] border border-white/20 flex-shrink-0"
          />
        )}

        {audioOnly && (
          <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                stroke="#22c55e"
                strokeWidth="2"
              />
              <path
                d="M19 10v2a7 7 0 0 1-14 0v-2"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}

        {/* Call info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {peerName || "In call"}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-medium tabular-nums">
              {formatDuration(callSeconds)}
            </span>
            <span className="text-white/40 text-xs ml-1">Tap to return</span>
          </div>
        </div>

        {/* End Call button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            endCall();
          }}
          className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          title="End call"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72 12.1 12.1 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.1 12.1 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"
              fill="white"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
