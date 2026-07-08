const OFFER_PREFIX = "lm_pending_call_offer_";
const ACCEPT_PREFIX = "lm_call_accepted_";

function roomKey(roomId: string | number): string {
  return String(roomId).trim();
}

export function stashPendingCallOffer(
  roomId: string | number,
  offer: RTCSessionDescriptionInit
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OFFER_PREFIX + roomKey(roomId), JSON.stringify(offer));
}

export function peekPendingCallOffer(
  roomId: string | number
): RTCSessionDescriptionInit | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(OFFER_PREFIX + roomKey(roomId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RTCSessionDescriptionInit;
  } catch {
    return null;
  }
}

export function takePendingCallOffer(
  roomId: string | number
): RTCSessionDescriptionInit | null {
  if (typeof window === "undefined") return null;
  const key = OFFER_PREFIX + roomKey(roomId);
  const offer = peekPendingCallOffer(roomId);
  sessionStorage.removeItem(key);
  return offer;
}

export function markCallAccepted(roomId: string | number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCEPT_PREFIX + roomKey(roomId), "1");
}

export function isCallAccepted(roomId: string | number): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ACCEPT_PREFIX + roomKey(roomId)) === "1";
}

export function clearCallAccepted(roomId: string | number): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCEPT_PREFIX + roomKey(roomId));
}
