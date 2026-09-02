"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { callWsUrl, getVideoAudio, openLetsMeetWebSocket, resolveCallRoomId } from "@/lib/letsmeet";
import {
  clearCallAccepted,
  isCallAccepted,
  takePendingCallOffer,
} from "@/lib/incomingCall";
import {
  DEFAULT_ICE_SERVERS,
  hasUsableTurn,
} from "@/lib/iceServers";

const VIDEO_CAPTURE: MediaTrackConstraints = {
  width: { ideal: 176, max: 176 },
  height: { ideal: 144, max: 144 },
  frameRate: { ideal: 10, max: 10 },
};

const VIDEO_MAX_BITRATE = 150_000;
const VIDEO_MAX_FRAMERATE = 15;

async function fetchEnvIceServers(): Promise<RTCIceServer[] | null> {
  try {
    const res = await fetch("/api/ice-servers", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { iceServers?: RTCIceServer[] };
    if (data.iceServers?.length && hasUsableTurn(data.iceServers)) {
      return data.iceServers;
    }
  } catch {
    // ignore — fall through to defaults
  }
  return null;
}

async function resolveIceServers(): Promise<RTCIceServer[]> {
  try {
    const config = await getVideoAudio();
    // Only trust upstream ICE if TURN includes username+credential.
    if (config.iceServers?.length && hasUsableTurn(config.iceServers)) {
      return config.iceServers;
    }
  } catch {
    // Best-effort — try env / defaults below.
  }

  const fromEnv = await fetchEnvIceServers();
  if (fromEnv) return fromEnv;
  return DEFAULT_ICE_SERVERS;
}

export const CALL_LIMIT_SECONDS = 10 * 60;

function enableOpusDtx(sdp: string): string {
  const opusPt = sdp.match(/^a=rtpmap:(\d+) opus\/48000/m)?.[1];
  if (!opusPt) return sdp;
  const fmtpRe = new RegExp(`^a=fmtp:${opusPt} (.+)$`, "m");
  const match = sdp.match(fmtpRe);
  if (!match) return sdp;
  if (match[1].includes("usedtx=1")) return sdp;
  return sdp.replace(fmtpRe, `a=fmtp:${opusPt} ${match[1]};usedtx=1`);
}

function mungeSessionDescription(
  desc: RTCSessionDescriptionInit
): RTCSessionDescriptionInit {
  if (!desc.sdp) return desc;
  return { ...desc, sdp: enableOpusDtx(desc.sdp) };
}

async function applyVideoSenderLimits(pc: RTCPeerConnection): Promise<void> {
  const sender = pc.getSenders().find((s) => s.track?.kind === "video");
  if (!sender) return;
  const params = sender.getParameters();
  if (!params.encodings?.length) params.encodings = [{}];
  params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE;
  params.encodings[0].maxFramerate = VIDEO_MAX_FRAMERATE;
  try {
    await sender.setParameters(params);
  } catch {}
}

// ─── Context types ────────────────────────────────────────────────────────────

interface ActiveCallState {
  inCall: boolean;
  roomId: string | number | null;
  peerName: string;
  peerPhoto: string | null;
  status: string;
  callSeconds: number;
  isMuted: boolean;
  isCameraOff: boolean;
  audioOnly: boolean;
  incomingCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  /** Hidden video element for PiP — managed by the provider */
  pipVideoRef: React.RefObject<HTMLVideoElement | null>;
  startCall: (roomId: string | number, opts?: { audioOnly?: boolean; acceptIncoming?: boolean; peerName?: string; peerPhoto?: string | null }) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const ActiveCallContext = createContext<ActiveCallState | null>(null);

export function useActiveCall() {
  const ctx = useContext(ActiveCallContext);
  if (!ctx) throw new Error("useActiveCall must be used within ActiveCallProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ActiveCallProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState("Idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [roomId, setRoomId] = useState<string | number | null>(null);
  const [peerName, setPeerName] = useState("");
  const [peerPhoto, setPeerPhoto] = useState<string | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inCallRef = useRef(false);
  const roomIdRef = useRef<string | number | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioOnlyRef = useRef(false);
  const acceptIncomingRef = useRef(false);

  const peerCreateInflightRef = useRef<Promise<RTCPeerConnection> | null>(null);
  const answerAppliedRef = useRef(false);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const stopRetry = useCallback(() => {
    if (retryRef.current) {
      clearInterval(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const initMedia = useCallback(async (isAudioOnly: boolean) => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        isAudioOnly
          ? { video: false, audio: true }
          : { video: VIDEO_CAPTURE, audio: true }
      );
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("Camera/mic permission denied");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setStatus("No camera/microphone found");
      } else {
        setStatus("Could not access camera/mic");
      }
      throw err;
    }
  }, []);

  const attachRemoteToPip = useCallback((stream: MediaStream) => {
    if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = stream;
      void pipVideoRef.current.play().catch(() => {});
    }
  }, []);

  const createPeer = useCallback(async (isAudioOnly: boolean) => {
    if (peerRef.current) return peerRef.current;
    if (peerCreateInflightRef.current) return peerCreateInflightRef.current;

    peerCreateInflightRef.current = (async () => {
      if (peerRef.current) return peerRef.current;

      const stream = await initMedia(isAudioOnly);
      const iceServers = await resolveIceServers();
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: "all",
      });
      peerRef.current = pc;

      const remote = new MediaStream();
      remoteStreamRef.current = remote;
      setRemoteStream(remote);
      attachRemoteToPip(remote);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
        setRemoteStream(remote);
        attachRemoteToPip(remote);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({ type: "ice", candidate: event.candidate })
          );
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("Connected");
          setInCall(true);
          setIncomingCall(false);
          stopRetry();
          void applyVideoSenderLimits(pc);
        } else if (pc.connectionState === "failed") {
          setStatus("Connection failed");
        } else if (pc.connectionState === "disconnected") {
          setStatus("Reconnecting…");
        } else if (pc.connectionState !== "closed") {
          setStatus(pc.connectionState);
        }
      };

      return pc;
    })();

    const inflight = peerCreateInflightRef.current;
    void inflight.finally(() => {
      if (peerCreateInflightRef.current === inflight) {
        peerCreateInflightRef.current = null;
      }
    });
    return inflight;
  }, [initMedia, stopRetry, attachRemoteToPip]);

  const answerOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const ws = socketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        const pc = await createPeer(audioOnlyRef.current);
        // Already negotiated — ignore duplicate offers from caller retry loop.
        if (pc.signalingState === "stable" && pc.currentRemoteDescription) {
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = mungeSessionDescription(await pc.createAnswer());
        await pc.setLocalDescription(answer);
        await applyVideoSenderLimits(pc);
        ws.send(JSON.stringify({ type: "answer", answer }));
        setStatus("Connecting…");
        setIncomingCall(false);
        pendingOfferRef.current = null;
      } catch (err) {
        // If getUserMedia already set a specific status (permission denied,
        // no device found), keep that message instead of a generic one.
        const name = err instanceof Error ? err.name : "";
        if (name !== "NotAllowedError" && name !== "PermissionDeniedError" && name !== "NotFoundError" && name !== "DevicesNotFoundError") {
          setStatus("Could not answer call");
        }
      }
    },
    [createPeer]
  );

  const endCall = useCallback(() => {
    stopRetry();

    // Notify the other peer before tearing down
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "hangup" }));
    }

    peerRef.current?.close();
    peerRef.current = null;
    peerCreateInflightRef.current = null;
    answerAppliedRef.current = false;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current = null;

    if (pipVideoRef.current) pipVideoRef.current.srcObject = null;

    // Exit PiP if active
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => {});
    }

    setLocalStream(null);
    setRemoteStream(null);
    setInCall(false);
    setIncomingCall(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setStatus("Call ended");
    setCallSeconds(0);
    pendingOfferRef.current = null;

    // Close WS
    socketRef.current?.close();
    socketRef.current = null;

    const id = roomIdRef.current;
    if (id != null) clearCallAccepted(id);
    setRoomId(null);
    setPeerName("");
    setPeerPhoto(null);
  }, [stopRetry]);

  const sendOffer = useCallback(async () => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    const existing = peerRef.current;
    // Negotiation already complete — do not re-send offers (causes duplicate
    // answers → InvalidStateError: setRemoteDescription in stable).
    if (
      existing &&
      answerAppliedRef.current &&
      existing.signalingState === "stable" &&
      existing.remoteDescription
    ) {
      return true;
    }
    if (existing?.localDescription && existing.signalingState === "have-local-offer") {
      ws.send(
        JSON.stringify({
          type: "offer",
          offer: existing.localDescription.toJSON(),
          audioOnly: audioOnlyRef.current,
        })
      );
      return true;
    }

    const pc = await createPeer(audioOnlyRef.current);
    if (pc.localDescription) {
      ws.send(
        JSON.stringify({
          type: "offer",
          offer: pc.localDescription.toJSON(),
          audioOnly: audioOnlyRef.current,
        })
      );
      return true;
    }
    const offer = mungeSessionDescription(await pc.createOffer());
    await pc.setLocalDescription(offer);
    await applyVideoSenderLimits(pc);
    ws.send(JSON.stringify({ type: "offer", offer, audioOnly: audioOnlyRef.current }));
    return true;
  }, [createPeer]);

  const connectWebSocket = useCallback(
    (id: string | number) => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      const ws = openLetsMeetWebSocket(callWsUrl(id));
      if (!ws) {
        setStatus("Could not open call connection");
        return;
      }
      socketRef.current = ws;
      let opened = false;

      ws.onopen = () => {
        opened = true;
        if (acceptIncomingRef.current || isCallAccepted(id)) {
          const pending = takePendingCallOffer(id);
          if (pending) {
            setStatus("Joining call…");
            void answerOffer(pending);
            return;
          }
          setStatus("Joining call…");
        } else {
          setStatus("Ready");
        }
      };

      ws.onerror = () => {
        if (!opened && !inCallRef.current) {
          setStatus("Call server unreachable");
        }
      };

      ws.onmessage = async (event) => {
        let data: {
          type?: string;
          offer?: RTCSessionDescriptionInit;
          answer?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
          audioOnly?: boolean;
        };
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === "ring") {
          // If the caller says it's audio-only, respect that
          if (data.audioOnly) {
            audioOnlyRef.current = true;
            setAudioOnly(true);
          }
          if (!inCallRef.current && !acceptIncomingRef.current && !isCallAccepted(id)) {
            setIncomingCall(true);
            setStatus("Incoming call…");
          }
          return;
        }

        if (data.type === "offer" && data.offer) {
          if (data.audioOnly) {
            audioOnlyRef.current = true;
            setAudioOnly(true);
          }
          pendingOfferRef.current = data.offer;
          if (acceptIncomingRef.current || isCallAccepted(id)) {
            await answerOffer(data.offer);
          } else {
            setIncomingCall(true);
            setStatus("Incoming call…");
          }
        } else if (data.type === "answer" && data.answer) {
          const pc = peerRef.current;
          if (!pc || pc.signalingState !== "have-local-offer") return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            answerAppliedRef.current = true;
            setStatus("Connecting…");
            stopRetry();
          } catch {
            // Ignore stale/duplicate answers.
          }
        } else if (data.type === "reject") {
          stopRetry();
          setStatus("Call declined");
        } else if (data.type === "hangup") {
          endCall();
        } else if (data.type === "ice" && data.candidate && peerRef.current) {
          try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch {}
        }
      };

      ws.onclose = () => {
        if (!opened && !inCallRef.current) {
          setStatus("Call server blocked the connection");
          stopRetry();
          return;
        }
        if (inCallRef.current) {
          setStatus("Disconnected");
          endCall();
        }
      };
    },
    [answerOffer, endCall, stopRetry]
  );

  const startCall = useCallback(
    async (id: string | number, opts?: { audioOnly?: boolean; acceptIncoming?: boolean; peerName?: string; peerPhoto?: string | null }) => {
      const resolved = (await resolveCallRoomId(id)) ?? String(id).trim();
      const callRoom = resolved || String(id);

      // If there's already an active call to the same room, skip
      if (inCallRef.current && roomIdRef.current === callRoom) return;
      // Any previous session for a *different* room must be fully torn down
      // first — not just when `inCall` is true. A half-started call (ringing,
      // not yet connected) can otherwise leave a stale RTCPeerConnection /
      // WebSocket around, whose cached offer/localDescription then gets
      // reused for the new room (see `sendOffer`), effectively routing the
      // new call through the old session.
      if (roomIdRef.current !== null && roomIdRef.current !== callRoom) {
        endCall();
      }

      const isAudioOnly = opts?.audioOnly ?? false;
      audioOnlyRef.current = isAudioOnly;
      acceptIncomingRef.current = opts?.acceptIncoming ?? false;
      setAudioOnly(isAudioOnly);
      setRoomId(callRoom);
      setPeerName(opts?.peerName ?? "");
      setPeerPhoto(opts?.peerPhoto ?? null);
      setStatus("Connecting…");

      connectWebSocket(callRoom);

      // Wait for WS open, then send offer
      await new Promise<void>((resolve) => {
        const check = () => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      if (acceptIncomingRef.current) return; // Will answer when offer arrives

      socketRef.current?.send(JSON.stringify({ type: "ring", audioOnly: isAudioOnly }));
      try {
        await sendOffer();
      } catch {
        // initMedia already set a specific status (permission denied, no
        // device, etc); don't start the retry loop, it would just keep
        // re-prompting for a permission that already failed.
        return;
      }
      setStatus("Calling…");

      stopRetry();
      retryRef.current = setInterval(() => {
        void (async () => {
          const open = socketRef.current?.readyState === WebSocket.OPEN;
          if (!open || inCallRef.current) return;
          socketRef.current?.send(JSON.stringify({ type: "ring", audioOnly: audioOnlyRef.current }));
          try {
            await sendOffer();
          } catch {
            stopRetry();
          }
        })();
      }, 4000);
    },
    [connectWebSocket, endCall, sendOffer, stopRetry]
  );

  const acceptCallAction = useCallback(async () => {
    const offer =
      pendingOfferRef.current ??
      (roomIdRef.current != null ? takePendingCallOffer(roomIdRef.current) : null);
    if (!offer) {
      setStatus("Waiting for caller…");
      setIncomingCall(false);
      return;
    }
    await answerOffer(offer);
  }, [answerOffer]);

  const declineCall = useCallback(() => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "reject" }));
    }
    pendingOfferRef.current = null;
    setIncomingCall(false);
    setStatus("Call declined");
    if (roomIdRef.current != null) clearCallAccepted(roomIdRef.current);
  }, []);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setIsMuted((prev) => {
      const next = !prev;
      stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    if (audioOnlyRef.current) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    setIsCameraOff((prev) => {
      const next = !prev;
      stream.getVideoTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  // Call duration timer + auto-end
  useEffect(() => {
    if (!inCall) {
      setCallSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setCallSeconds((s) => {
        const next = s + 1;
        if (next >= CALL_LIMIT_SECONDS) {
          endCall();
          return CALL_LIMIT_SECONDS;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [inCall, endCall]);

  const value: ActiveCallState = {
    inCall,
    roomId,
    peerName,
    peerPhoto,
    status,
    callSeconds,
    isMuted,
    isCameraOff,
    audioOnly,
    incomingCall,
    localStream,
    remoteStream,
    pipVideoRef,
    startCall,
    acceptCall: acceptCallAction,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  };

  return (
    <ActiveCallContext.Provider value={value}>
      {children}
      {/* Hidden video element for PiP */}
      <video
        ref={pipVideoRef}
        autoPlay
        playsInline
        className="fixed w-0 h-0 opacity-0 pointer-events-none"
        aria-hidden
      />
    </ActiveCallContext.Provider>
  );
}
