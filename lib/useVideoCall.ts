"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { callWsUrl } from "@/lib/letsmeet";
import {
  clearCallAccepted,
  isCallAccepted,
  takePendingCallOffer,
} from "@/lib/incomingCall";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: [
        "turn:turner.lenhub.net:3478?transport=udp",
        "turn:turner.lenhub.net:3478?transport=tcp",
      ],
      username: "webrtc",
      credential: "YourStrongPassword123!",
    },
  ],
};

interface UseVideoCallOptions {
  /** User tapped Accept on the incoming-call screen */
  acceptIncoming?: boolean;
}

export function useVideoCall(
  roomId: string | number | null,
  options: UseVideoCallOptions = {}
) {
  const { acceptIncoming = false } = options;
  const [status, setStatus] = useState("Connecting…");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inCallRef = useRef(false);
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  const stopRetry = useCallback(() => {
    if (retryRef.current) {
      clearInterval(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const attachLocal = useCallback((stream: MediaStream) => {
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
  }, []);

  const attachRemote = useCallback((stream: MediaStream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, []);

  const initMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    attachLocal(stream);
    return stream;
  }, [attachLocal]);

  const createPeer = useCallback(async () => {
    if (peerRef.current) return peerRef.current;

    const stream = await initMedia();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = pc;

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    attachRemote(remote);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
      attachRemote(remote);
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
      } else if (pc.connectionState === "failed") {
        setStatus("Connection failed");
      } else if (pc.connectionState !== "closed") {
        setStatus(pc.connectionState);
      }
    };

    return pc;
  }, [attachRemote, initMedia, stopRetry]);

  const answerOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const ws = socketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      try {
        const pc = await createPeer();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", answer }));
        setStatus("Connecting…");
        setIncomingCall(false);
        pendingOfferRef.current = null;
      } catch {
        setStatus("Could not answer call");
      }
    },
    [createPeer]
  );

  const endCall = useCallback(() => {
    stopRetry();
    peerRef.current?.close();
    peerRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setInCall(false);
    setIncomingCall(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setStatus("Call ended");
    pendingOfferRef.current = null;

    const id = roomIdRef.current;
    if (id != null) clearCallAccepted(id);
  }, [stopRetry]);

  const sendOffer = useCallback(async () => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    const existing = peerRef.current;
    if (existing?.localDescription) {
      ws.send(
        JSON.stringify({ type: "offer", offer: existing.localDescription.toJSON() })
      );
      return true;
    }

    const pc = await createPeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "offer", offer }));
    return true;
  }, [createPeer]);

  const startCall = useCallback(async () => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus("Waiting for server…");
      return;
    }

    ws.send(JSON.stringify({ type: "ring" }));
    const sent = await sendOffer();
    if (!sent) return;

    setStatus("Calling…");
    stopRetry();
    retryRef.current = setInterval(() => {
      void (async () => {
        const open = socketRef.current?.readyState === WebSocket.OPEN;
        if (!open || inCallRef.current) return;
        ws.send(JSON.stringify({ type: "ring" }));
        await sendOffer();
      })();
    }, 4000);
  }, [sendOffer, stopRetry]);

  const acceptCall = useCallback(async () => {
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
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setIsCameraOff((prev) => {
      const next = !prev;
      stream.getVideoTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, []);

  const shouldAutoAnswer = useCallback(
    (id: string | number) => acceptIncoming || isCallAccepted(id),
    [acceptIncoming]
  );

  useEffect(() => {
    const id =
      roomId == null
        ? null
        : typeof roomId === "number"
          ? roomId
          : String(roomId).trim();
    if (id == null || id === "" || (typeof id === "number" && Number.isNaN(id))) {
      setStatus("No room ID");
      return;
    }

    const ws = new WebSocket(callWsUrl(id));
    socketRef.current = ws;

    ws.onopen = () => {
      if (shouldAutoAnswer(id)) {
        const pending = takePendingCallOffer(id);
        if (pending) {
          setStatus("Joining call…");
          void answerOffer(pending);
          return;
        }
        setStatus("Joining call…");
      } else {
        setStatus("Ready — tap Start Call");
      }
    };

    ws.onmessage = async (event) => {
      let data: {
        type?: string;
        offer?: RTCSessionDescriptionInit;
        answer?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "ring") {
        if (!inCallRef.current && !shouldAutoAnswer(id)) {
          setIncomingCall(true);
          setStatus("Incoming call…");
        }
        return;
      }

      if (data.type === "offer" && data.offer) {
        pendingOfferRef.current = data.offer;
        if (shouldAutoAnswer(id)) {
          await answerOffer(data.offer);
        } else {
          setIncomingCall(true);
          setStatus("Incoming call…");
        }
      } else if (data.type === "answer" && data.answer) {
        const pc = peerRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          setStatus("Connected");
          stopRetry();
        }
      } else if (data.type === "reject") {
        stopRetry();
        setStatus("Call declined");
      } else if (data.type === "ice" && data.candidate && peerRef.current) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          // ICE can arrive before remote description
        }
      }
    };

    ws.onclose = () => setStatus("Disconnected");

    return () => {
      ws.close();
      socketRef.current = null;
      endCall();
    };
  }, [roomId, answerOffer, endCall, shouldAutoAnswer, stopRetry]);

  return {
    status,
    inCall,
    incomingCall,
    isMuted,
    isCameraOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
