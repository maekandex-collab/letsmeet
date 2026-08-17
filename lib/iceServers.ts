/** Shared ICE / TURN helpers for WebRTC calls. */

const FALLBACK_TURN_HOST = "turner.lenhub.net";

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    // UDP alone fails on many cellular / strict NATs — include TCP.
    // Port 5349 is closed on this host, so it is intentionally omitted.
    urls: [
      `turn:${FALLBACK_TURN_HOST}:3478?transport=udp`,
      `turn:${FALLBACK_TURN_HOST}:3478?transport=tcp`,
    ],
    username: "webrtc",
    credential: "YourStrongPassword123!",
  },
];

export function hasUsableTurn(servers: RTCIceServer[]): boolean {
  return servers.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    const isTurn = urls.some(
      (u) => typeof u === "string" && /^turns?:/i.test(u)
    );
    return isTurn && Boolean(s.username) && Boolean(s.credential);
  });
}

/** Build ICE servers from env-style values (comma-separated TURN URLs). */
export function buildIceServersFromEnv(opts: {
  turnUrls?: string;
  turnUsername?: string;
  turnCredential?: string;
  stunUrls?: string;
}): RTCIceServer[] | null {
  const turnUrls = (opts.turnUrls ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const username = (opts.turnUsername ?? "").trim();
  const credential = (opts.turnCredential ?? "").trim();
  if (!turnUrls.length || !username || !credential) return null;

  const stunUrls = (opts.stunUrls ?? "stun:stun.l.google.com:19302")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const servers: RTCIceServer[] = [];
  if (stunUrls.length) servers.push({ urls: stunUrls.length === 1 ? stunUrls[0] : stunUrls });
  servers.push({ urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls, username, credential });
  return servers;
}
