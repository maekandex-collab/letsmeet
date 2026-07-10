"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useVideoCall } from "@/lib/useVideoCall";
import {
  findMatchByRoomId,
  parseNumericRoomId,
  readChatPeer,
} from "@/lib/letsmeet";
import Avatar from "@/components/Avatar";
import IncomingCallOverlay from "@/components/IncomingCallOverlay";

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const CALL_LIMIT_NOTICE = "Calls are limited to 5–10 minutes.";

function VideoCallContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const segment = String(params.roomId ?? "").trim();
  const roomId = segment ? (parseNumericRoomId(segment) ?? segment) : null;
  const acceptIncoming = searchParams.get("accept") === "1";
  const audioOnly = searchParams.get("audio") === "1";
  const [name, setName] = useState(audioOnly ? "Audio call" : "Video call");
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (roomId == null) return;
    const peer = readChatPeer();
    if (peer?.name) {
      setName(peer.name);
      setPhoto(peer.photo);
      return;
    }
    let cancelled = false;
    (async () => {
      const match = await findMatchByRoomId(roomId);
      if (!cancelled && match) {
        setName(match.name);
        setPhoto(match.profile_photo);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const backHref = roomId != null ? `/chat/${roomId}` : "/messages";

  const {
    status,
    inCall,
    incomingCall,
    isMuted,
    isCameraOff,
    callSeconds,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useVideoCall(roomId, { acceptIncoming, audioOnly });

  return (
    <div className="mobile-shell flex flex-col min-h-dvh bg-dark relative overflow-hidden">
      {!audioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover bg-[#1a2030]"
        />
      )}

      {audioOnly && (
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-[#1a2030] to-[#1a2030]" />
      )}

      {/* Hidden remote audio sink for audio-only calls */}
      {audioOnly && (
        <video ref={remoteVideoRef} autoPlay playsInline className="sr-only" />
      )}

      {!inCall && !incomingCall && (
        <div className="absolute inset-0 bg-[#1a2030]/90 flex flex-col items-center justify-center z-[1] px-8 text-center">
          {audioOnly ? (
            <Avatar photo={photo} name={name} size="lg" className="!w-24 !h-24 text-lg mb-4" priority />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#2a2a40] flex items-center justify-center mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <polygon points="23 7 16 12 23 17 23 7" stroke="#616568" strokeWidth="2" />
                <rect x="1" y="5" width="15" height="14" rx="2" stroke="#616568" strokeWidth="2" />
              </svg>
            </div>
          )}
          <p className="text-white font-bold text-lg mb-1">{name}</p>
          <p className="text-white/60 text-sm mb-6">{status}</p>
          {roomId != null && !acceptIncoming && (
            <button
              onClick={() => void startCall()}
              className="btn-primary px-8"
            >
              {audioOnly ? "Start audio call" : "Start call"}
            </button>
          )}
          <p className="text-white/40 text-xs mt-6">{CALL_LIMIT_NOTICE}</p>
        </div>
      )}

      {incomingCall && !inCall && (
        <IncomingCallOverlay
          name={name}
          photo={photo}
          onAccept={() => void acceptCall()}
          onDecline={declineCall}
        />
      )}

      {!audioOnly && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute top-20 right-4 w-28 h-40 rounded-2xl object-cover bg-[#2a2a40] border-2 border-white/20 shadow-card z-10"
        />
      )}

      {audioOnly && inCall && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[1] pointer-events-none">
          <Avatar photo={photo} name={name} size="lg" className="!w-28 !h-28 text-xl" priority />
          <p className="text-white font-bold text-xl mt-4">{name}</p>
          <p className="text-white/60 text-sm mt-1 capitalize">{status}</p>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between px-5 pt-14 pb-4">
        <Link
          href={backHref}
          onClick={endCall}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Link>
        <div className="text-center">
          <p className="text-white font-bold text-base truncate max-w-[200px]">{name}</p>
          {inCall ? (
            <p className="text-white/80 text-xs font-medium tabular-nums">
              {formatDuration(callSeconds)}
            </p>
          ) : (
            <p className="text-white/60 text-xs capitalize">{status}</p>
          )}
        </div>
        <div className="w-10" />
      </div>

      {inCall && (
        <div className="relative z-10 -mt-2 flex justify-center">
          <span className="text-white/50 text-[11px] bg-black/20 px-3 py-1 rounded-full">
            {CALL_LIMIT_NOTICE}
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-8 pb-16 z-10">
        <div className="flex items-center justify-center gap-5">
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? "bg-white text-dark" : "bg-white/10 text-white"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {isMuted && (
                  <path
                    d="M3 3l18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
            <span className="text-white/70 text-[11px]">
              {isMuted ? "Muted" : "Mic on"}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              endCall();
              window.location.href = backHref;
            }}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-card"
            title="End call"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72 12.1 12.1 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.1 12.1 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"
                fill="white"
              />
            </svg>
          </button>
            <span className="text-white/70 text-[11px]">End</span>
          </div>

          {!audioOnly && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isCameraOff ? "bg-white text-dark" : "bg-white/10 text-white"
                }`}
                title={isCameraOff ? "Turn camera on" : "Turn camera off"}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="2" />
                  <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                  {isCameraOff && (
                    <path
                      d="M3 3l18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </button>
              <span className="text-white/70 text-[11px]">
                {isCameraOff ? "Camera off" : "Camera on"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VideoCallRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell min-h-dvh flex items-center justify-center text-white bg-dark">
          Loading…
        </div>
      }
    >
      <VideoCallContent />
    </Suspense>
  );
}
