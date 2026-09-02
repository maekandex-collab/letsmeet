"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useActiveCall } from "@/lib/ActiveCallContext";
import {
  findMatchByRoomId,
  parseNumericRoomId,
  peerMatchesRoom,
  readChatPeer,
  resolveCallRoomId,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const segment = String(params.roomId ?? "").trim();
  const [roomId, setRoomId] = useState<string | null>(
    segment
      ? String(parseNumericRoomId(segment) ?? segment)
      : null
  );
  const acceptIncoming = searchParams.get("accept") === "1";
  const audioOnlyParam = searchParams.get("audio") === "1";

  const [name, setName] = useState(audioOnlyParam ? "Audio call" : "Video call");
  const [photo, setPhoto] = useState<string | null>(null);
  const [swapped, setSwapped] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    status,
    inCall,
    incomingCall,
    isMuted,
    isCameraOff,
    callSeconds,
    audioOnly,
    localStream,
    remoteStream,
    roomId: activeRoomId,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useActiveCall();

  useEffect(() => {
    if (!segment) return;
    let cancelled = false;
    (async () => {
      const resolved = await resolveCallRoomId(segment);
      if (cancelled) return;
      const next = resolved ?? String(parseNumericRoomId(segment) ?? segment);
      setRoomId(next);
      const qs = searchParams.toString();
      const suffix = qs ? `?${qs}` : "";
      if (resolved && resolved !== segment) {
        router.replace(`/video-call/${resolved}${suffix}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [segment, router, searchParams]);

  // Resolve peer name/photo
  useEffect(() => {
    if (roomId == null) return;
    const peer = readChatPeer();
    if (peer?.name && peerMatchesRoom(peer, roomId)) {
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
    return () => { cancelled = true; };
  }, [roomId]);

  // Initiate call when page mounts (if not already in call for this room)
  useEffect(() => {
    if (roomId == null) return;
    if (activeRoomId === roomId && inCall) return; // Already connected to this room
    if (activeRoomId === roomId) return; // Already connecting

    void startCall(roomId, {
      audioOnly: audioOnlyParam,
      acceptIncoming,
      peerName: name,
      peerPhoto: photo,
    }).catch(() => {
      // Status is already surfaced via `status` from ActiveCallContext
      // (e.g. permission denied); nothing else to do here.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Update peer info in context when resolved
  useEffect(() => {
    // We don't need to update context peer info from here since
    // it was passed during startCall. If name resolves later, just display locally.
  }, [name, photo]);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, swapped]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, swapped]);

  // Exit PiP when returning to call page (we're showing it fullscreen now)
  useEffect(() => {
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => {});
    }
  }, []);

  const backHref = roomId != null ? `/chat/${roomId}` : "/messages";

  return (
    <div className="mobile-shell flex flex-col min-h-dvh bg-dark relative overflow-hidden">
      {!audioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          onClick={() => swapped && setSwapped(false)}
          className={
            swapped
              ? "absolute top-20 right-4 w-28 h-40 rounded-2xl object-cover bg-[#2a2a40] border-2 border-white/20 shadow-card z-10 cursor-pointer"
              : "absolute inset-0 w-full h-full object-cover bg-[#1a2030]"
          }
        />
      )}

      {audioOnly && (
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-[#1a2030] to-[#1a2030]" />
      )}

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
          <p className="text-white/40 text-xs mt-6">{CALL_LIMIT_NOTICE}</p>
        </div>
      )}

      {incomingCall && !inCall && (
        <IncomingCallOverlay
          name={name}
          photo={photo}
          onAccept={() => void acceptCall()}
          onDecline={declineCall}
          audioOnly={audioOnly}
        />
      )}

      {!audioOnly && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          onClick={() => !swapped && setSwapped(true)}
          className={
            swapped
              ? "absolute inset-0 w-full h-full object-cover bg-[#1a2030]"
              : "absolute top-20 right-4 w-28 h-40 rounded-2xl object-cover bg-[#2a2a40] border-2 border-white/20 shadow-card z-10 cursor-pointer"
          }
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

      <div className="absolute bottom-0 left-0 right-0 px-6 pb-14 z-10">
        {!incomingCall && (
          <div className="mx-auto max-w-sm rounded-[28px] bg-black/45 backdrop-blur-md border border-white/10 px-5 py-4">
            <div className="flex items-end justify-center gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isMuted ? "bg-white text-dark" : "bg-white/15 text-white"
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
                  {isMuted ? "Muted" : "Mute"}
                </span>
              </div>

              {!audioOnly && (
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      isCameraOff ? "bg-white text-dark" : "bg-white/15 text-white"
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
                    {isCameraOff ? "Cam off" : "Video"}
                  </span>
                </div>
              )}

              {/* WhatsApp-style hang-up: red circle, handset facing down */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    endCall();
                    window.location.href = backHref;
                  }}
                  className="w-16 h-16 rounded-full bg-[#FF3B30] flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
                  title="End call"
                  aria-label="End call"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="rotate-[135deg]"
                    aria-hidden
                  >
                    <path
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72 12.1 12.1 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.1 12.1 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"
                      fill="white"
                    />
                  </svg>
                </button>
                <span className="text-white/70 text-[11px]">End</span>
              </div>
            </div>
          </div>
        )}
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
