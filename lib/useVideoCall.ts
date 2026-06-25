"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { callWsUrl } from "@/lib/letsmeet";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useVideoCall(roomId: number | null) {
  const [status, setStatus] = useState("Connecting…");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inCall, setInCall] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

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
      } else if (pc.connectionState === "failed") {
        setStatus("Connection failed");
      } else {
        setStatus(pc.connectionState);
      }
    };

    return pc;
  }, [attachRemote, initMedia]);

  const endCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    remoteStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setInCall(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setStatus("Call ended");
  }, []);

  const startCall = useCallback(async () => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus("Waiting for server…");
      return;
    }
    const pc = await createPeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "offer", offer }));
    setStatus("Calling…");
  }, [createPeer]);

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

  useEffect(() => {
    if (roomId == null || Number.isNaN(roomId)) {
      setStatus("No room ID");
      return;
    }

    const ws = new WebSocket(callWsUrl(roomId));
    socketRef.current = ws;

    ws.onopen = () => setStatus("Ready — tap Start Call");

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

      if (data.type === "offer" && data.offer) {
        const pc = await createPeer();
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", answer }));
        setStatus("Answering…");
      } else if (data.type === "answer" && data.answer) {
        const pc = peerRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          setStatus("Connected");
        }
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
  }, [roomId, createPeer, endCall]);

  return {
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
  };
}
