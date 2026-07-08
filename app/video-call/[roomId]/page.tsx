"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useVideoCall } from "@/lib/useVideoCall";
import {
  findMatchByRoomId,
  parseNumericRoomId,
  readChatPeer,
} from "@/lib/letsmeet";

function VideoCallContent() {
  const params = useParams();
  const segment = String(params.roomId ?? "").trim();
  const roomId = segment ? (parseNumericRoomId(segment) ?? segment) : null;
  const [name, setName] = useState("Video call");

  useEffect(() => {
    if (roomId == null) return;
    const peer = readChatPeer();
    if (peer?.name) {
      setName(peer.name);
      return;
    }
    let cancelled = false;
    (async () => {
      const match = await findMatchByRoomId(roomId);
      if (!cancelled && match) setName(match.name);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const backHref = roomId != null ? `/chat/${roomId}` : "/messages";

  const {
    status,
    inCall,
    isMuted,
    isCameraOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useVideoCall(roomId);

  return (
    <div className="mobile-shell flex flex-col h-screen bg-dark relative overflow-hidden">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover bg-[#1a2030]"
      />

      {!inCall && (
        <div className="absolute inset-0 bg-[#1a2030]/90 flex flex-col items-center justify-center z-[1] px-8 text-center">
          <div className="w-24 h-24 rounded-full bg-[#2a2a40] flex items-center justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <polygon points="23 7 16 12 23 17 23 7" stroke="#616568" strokeWidth="2" />
              <rect x="1" y="5" width="15" height="14" rx="2" stroke="#616568" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-white font-bold text-lg mb-1">{name}</p>
          <p className="text-white/60 text-sm mb-6">{status}</p>
          {roomId != null && (
            <button
              onClick={() => void startCall()}
              className="btn-primary px-8"
            >
              Start call
            </button>
          )}
        </div>
      )}

      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="absolute top-20 right-4 w-28 h-40 rounded-2xl object-cover bg-[#2a2a40] border-2 border-white/20 shadow-card z-10"
      />

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
          <p className="text-white/60 text-xs capitalize">{status}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-8 pb-16 z-10">
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={toggleMute}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"
            title={isMuted ? "Unmute" : "Mute"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                stroke="white"
                strokeWidth="2"
              />
              <path
                d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

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

          <button
            type="button"
            onClick={toggleCamera}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"
            title={isCameraOff ? "Camera on" : "Camera off"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <polygon points="23 7 16 12 23 17 23 7" stroke="white" strokeWidth="2" />
              <rect x="1" y="5" width="15" height="14" rx="2" stroke="white" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoCallRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell h-screen flex items-center justify-center text-white bg-dark">
          Loading…
        </div>
      }
    >
      <VideoCallContent />
    </Suspense>
  );
}
