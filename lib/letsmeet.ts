// LetsMeet API client. All calls go through the Next.js proxy at /api/letsmeet/*
// (see app/api/letsmeet/[...path]/route.ts) which forwards to the real backend.

const PROXY = "/api/letsmeet";

const MEDIA_BASE = (
  process.env.NEXT_PUBLIC_LETSMEET_BASE_URL ?? "https://mtn.lenhub.net"
).replace(/\/$/, "");

const MEDIA_PROXY = "/api/letsmeet-media";

const API_BASE = (
  process.env.NEXT_PUBLIC_LETSMEET_BASE_URL ?? "https://mtn.lenhub.net"
).replace(/\/$/, "");

/** WebSocket origin for Django Channels (chat + video signaling). */
export function getLetsMeetWsOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_LETSMEET_WS_BASE_URL ??
    process.env.NEXT_PUBLIC_LETSMEET_BASE_URL ??
    API_BASE;
  const url = new URL(raw.replace(/\/$/, "") || "https://mtn.lenhub.net");
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

/** Real-time text chat — `ws(s)://host/ws/chat/{roomId}/` */
export function chatWsUrl(roomId: string | number): string {
  return `${getLetsMeetWsOrigin()}/ws/chat/${roomId}/`;
}

/** WebRTC signaling — `ws(s)://host/ws/call/{roomId}/` */
export function callWsUrl(roomId: string | number): string {
  return `${getLetsMeetWsOrigin()}/ws/call/${roomId}/`;
}

// ─── Session storage ──────────────────────────────────────────────────────────

const TOKEN_KEY = "lm_token";
const USER_KEY = "lm_user";
const LOGIN_PROFILE_CACHE_KEY = "lm_login_profile_cache";
const LOCAL_PROFILE_DRAFT_KEY = "lm_local_profile_draft";

export interface SessionUser {
  userId: number;
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  hashedUserId?: string;
  profileCompleted: boolean;
}

const HASHED_USER_ID_KEY = "lm_hashed_user_id";

/** UUID-style id used by GET /single/user/profile (not the numeric swipe id). */
export function extractHashedUserId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  for (const key of ["hashed_user_id", "profile_user_id", "uuid", "user_hash"]) {
    const v = obj[key];
    if (typeof v === "string" && v.length >= 8 && !/^\d{1,6}$/.test(v)) return v;
  }
  const uid = obj.user_id;
  if (typeof uid === "string" && uid.length >= 8 && !/^\d+$/.test(uid)) return uid;
  return null;
}

export function storeHashedUserId(id: string): void {
  if (!id.trim()) return;
  updateUser({ hashedUserId: id });
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(HASHED_USER_ID_KEY, id);
    } catch {
      // ignore
    }
  }
}

export function getStoredHashedUserId(): string | null {
  const user = getUser();
  const fromUser = user?.hashedUserId?.trim();
  if (fromUser && !/^\d+$/.test(fromUser)) return fromUser;
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(HASHED_USER_ID_KEY)?.trim();
    if (stored && /^\d+$/.test(stored)) {
      // Legacy bug: phone tails were stored as hashed ids.
      window.localStorage.removeItem(HASHED_USER_ID_KEY);
      return null;
    }
    return stored || null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/** Decodes the JWT token to extract the numeric user ID. */
export function decodeUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1];
    const jsonStr = typeof window !== "undefined"
      ? window.atob(payloadBase64)
      : Buffer.from(payloadBase64, "base64").toString("utf-8");
    const payload = JSON.parse(jsonStr) as { user_id?: number };
    const id = Number(payload.user_id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/** Decodes the JWT token to extract the numeric user ID. */
export function getNumericUserId(): number | null {
  const token = getToken();
  if (!token) return null;
  return decodeUserIdFromToken(token);
}

export function getUserId(): string | null {
  const user = getUser();
  return user?.userId ? String(user.userId) : null;
}

/** True when `sender_id` from chat API / WebSocket belongs to the signed-in user. */
export function isOwnSenderId(senderId: number | string | null | undefined): boolean {
  if (senderId == null) return false;
  const s = String(senderId).trim();
  if (!s) return false;

  const candidates = new Set<string>();
  const user = getUser();
  if (user?.userId != null) candidates.add(String(user.userId));
  const numeric = getNumericUserId();
  if (numeric != null) candidates.add(String(numeric));
  if (user?.phone) {
    const digits = user.phone.replace(/\D/g, "");
    if (digits) {
      candidates.add(digits);
      if (digits.startsWith("234")) candidates.add(digits.slice(3));
      if (digits.startsWith("0")) candidates.add(digits.slice(1));
    }
  }
  return candidates.has(s);
}

export function setSession(token: string, user: SessionUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateUser(patch: Partial<SessionUser>): void {
  const current = getUser();
  if (!current) return;
  setSession(getToken() ?? "", { ...current, ...patch });
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  try {
    window.localStorage.removeItem(HASHED_USER_ID_KEY);
    window.localStorage.removeItem(LOGIN_PROFILE_CACHE_KEY);
    window.localStorage.removeItem(LOCAL_PROFILE_DRAFT_KEY);
  } catch {
    // ignore
  }
  resetDiscoverLocalState();
  // Lazy import avoided — clear inbox key directly to prevent circular deps at module init.
  try {
    window.localStorage.removeItem("lm_chat_inbox");
    window.dispatchEvent(new Event("lm-inbox-change"));
  } catch {
    // ignore
  }
}

/** Clear feed cache, swiped ids, and filter prefs — call on sign-up / sign-in / logout. */
export function resetDiscoverLocalState(): void {
  clearFeedSnapshot();
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("lm_swiped_targets");
    localStorage.setItem(
      "lm_discover_prefs",
      JSON.stringify({ min_age: 18, max_age: 40, religion: "" })
    );
  } catch {
    // ignore
  }
}

const USER_RELIGION_KEY = "lm_user_religion";

/** User's own religion from onboarding — not the discover feed filter. */
export function storeUserReligion(religion: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_RELIGION_KEY, religion);
  } catch {
    // ignore
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalizes a Nigerian phone number to the 234 international format so the
 * value sent to the backend is consistent regardless of how the user typed it.
 *   "08099448550"   -> "2348099448550"  (leading 0 replaced with 234)
 *   "8099448550"    -> "2348099448550"  (missing country code added)
 *   "2348099448550" -> "2348099448550"  (already correct, unchanged)
 *   "+2348099448550"-> "2348099448550"  (non-digits stripped)
 */
export function normalizePhone(input: string): string {
  const digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return `234${digits}`;
}

/** True when the backend returned its default logo instead of a real photo. */
export function isDefaultProfilePlaceholder(path?: string | null): boolean {
  if (!path) return true;
  const lower = path.toLowerCase();
  return (
    lower.includes("/static/images/logos") ||
    lower.includes("logos.png") ||
    lower.includes("default_profile") ||
    lower.includes("placeholder")
  );
}

/** Strip junk values; always returns a clean `/media/...` path or null. */
export function normalizeMediaInput(path?: string | null): string | null {
  const value = path?.trim();
  if (!value) return null;

  const dataIdx = value.indexOf("data:image/");
  if (dataIdx !== -1) {
    return value.slice(dataIdx);
  }
  const blobIdx = value.indexOf("blob:");
  if (blobIdx !== -1) {
    return value.slice(blobIdx);
  }

  const lower = value.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "none" || lower === "string") {
    return null;
  }

  let working = value;

  try {
    if (working.includes("/api/letsmeet-media")) {
      const parsed = new URL(working, "http://local");
      const inner = parsed.searchParams.get("url");
      if (inner) working = decodeURIComponent(inner);
    }
    if (working.startsWith("http://") || working.startsWith("https://")) {
      const u = new URL(working);
      if (u.hostname === "letsmeet.com.ng" || u.hostname === "mtn.lenhub.net") {
        working = u.pathname + u.search;
      }
    }
  } catch {
    // fall through
  }

  // Remove hostnames accidentally embedded in the path (e.g. /mtn.lenhub.net/media/...)
  for (let i = 0; i < 4; i++) {
    const stripped = working
      .replace(/^\/?(?:https?:\/\/)?mtn\.lenhub\.net\/?/i, "/")
      .replace(/^\/?(?:https?:\/\/)?letsmeet\.com\.ng\/?/i, "/");
    if (stripped === working) break;
    working = stripped;
  }

  working = working.replace(/\/{2,}/g, "/");
  if (!working.startsWith("/")) working = `/${working}`;

  return working;
}

const LETSMEET_MEDIA_HOSTS = ["https://letsmeet.com.ng", "http://letsmeet.com.ng"];

/** Upstream URLs to try for a normalized `/media/...` path. */
export function mediaUpstreamUrls(cleanPath: string): string[] {
  const path = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const paths = [path];
  if (path.includes("/profile_images/")) {
    paths.push(path.replace("/profile_images/", "/profile_pics/"));
  } else if (path.includes("/profile_pics/")) {
    paths.push(path.replace("/profile_pics/", "/profile_images/"));
  }

  const urls: string[] = [];
  for (const p of paths) {
    urls.push(`${MEDIA_BASE}${p}`);
  }
  for (const p of paths) {
    for (const host of LETSMEET_MEDIA_HOSTS) {
      urls.push(`${host}${p}`);
    }
  }
  return Array.from(new Set(urls));
}

/** Turns a backend media path (e.g. /media/profile_pics/x.jpg) into a full URL. */
export function mediaUrl(path?: string | null): string | null {
  const cleanPath = normalizeMediaInput(path);
  if (!cleanPath) return null;

  if (cleanPath.startsWith("data:") || cleanPath.startsWith("blob:")) {
    return cleanPath;
  }

  if (cleanPath.startsWith("//")) {
    return `${MEDIA_PROXY}?url=${encodeURIComponent(normalizeMediaInput(`http:${cleanPath}`) ?? cleanPath)}`;
  }

  // Proxy receives a normalized `/media/...` path (or full URL stripped to path).
  return `${MEDIA_PROXY}?url=${encodeURIComponent(cleanPath)}`;
}

/** Public CDN URL (bypasses Next proxy). Works in `<img>` without CORS issues. */
export function directMediaUrl(path?: string | null): string | null {
  const cleanPath = normalizeMediaInput(path);
  if (!cleanPath) return null;
  if (cleanPath.startsWith("data:") || cleanPath.startsWith("blob:")) {
    return cleanPath;
  }
  if (cleanPath.startsWith("http")) return null;
  return `${MEDIA_BASE}${cleanPath}`;
}

/** Warm the browser cache for upcoming profile photos (call after feed/matches load). */
const clientMediaBlobs = new Map<string, string>();
const CLIENT_BLOB_MAX = 64;

function mediaCacheKey(path?: string | null): string | null {
  return normalizeMediaInput(path);
}

/** URLs for <img src> — direct CDN first (fast in browser), then same-origin proxy. */
export function displayMediaCandidates(path?: string | null): string[] {
  const cleanPath = normalizeMediaInput(path);
  if (cleanPath && (cleanPath.startsWith("data:") || cleanPath.startsWith("blob:"))) {
    return [cleanPath];
  }

  if (typeof window !== "undefined") {
    const key = mediaCacheKey(path);
    const blob = key ? clientMediaBlobs.get(key) : undefined;
    if (blob) return [blob];
  }

  const urls: string[] = [];
  const direct = directMediaUrl(path);
  if (direct) urls.push(direct);

  const proxy = mediaUrl(path);
  if (proxy && proxy !== direct) urls.push(proxy);

  return urls;
}

/** All fetch targets for warm-cache (proxy + CDN + upstream mirrors). */
export function mediaSourceCandidates(path?: string | null): string[] {
  const urls = displayMediaCandidates(path);
  const cleanPath = normalizeMediaInput(path);

  if (cleanPath?.startsWith("/")) {
    for (const upstream of mediaUpstreamUrls(cleanPath)) {
      urls.push(upstream);
    }
  }

  return Array.from(new Set(urls));
}

export function getClientMediaUrl(path?: string | null): string | null {
  if (typeof window === "undefined") return mediaUrl(path);
  const key = mediaCacheKey(path);
  if (key && clientMediaBlobs.has(key)) return clientMediaBlobs.get(key)!;
  return mediaUrl(path);
}

export function clearMediaCache(path?: string | null): void {
  if (typeof window === "undefined") return;
  const key = mediaCacheKey(path);
  if (!key) return;
  const objUrl = clientMediaBlobs.get(key);
  if (objUrl) {
    try {
      URL.revokeObjectURL(objUrl);
    } catch {
      // ignore
    }
    clientMediaBlobs.delete(key);
  }
}


export async function warmMediaBlob(path?: string | null): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const key = mediaCacheKey(path);
  if (!key) return null;
  if (key.startsWith("data:") || key.startsWith("blob:")) {
    return key;
  }

  const existing = clientMediaBlobs.get(key);
  if (existing) return existing;

  const inflight = warmInflight.get(key);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      // Only fetch same-origin proxy URLs — cross-origin media hosts block fetch() via CORS.
      const fetchable = mediaSourceCandidates(path).filter(
        (u) => u.startsWith("blob:") || u.startsWith(MEDIA_PROXY)
      );

      for (const candidate of fetchable) {
        if (candidate.startsWith("blob:")) return candidate;
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 6_000);
        let res: Response;
        try {
          res = await fetch(candidate, {
            cache: "force-cache",
            signal: controller.signal,
          });
        } catch {
          continue;
        } finally {
          window.clearTimeout(timer);
        }
        if (!res.ok) continue;
        const blob = await res.blob();
        if (blob.type.includes("json") || blob.type.includes("text/html")) continue;
        const obj = URL.createObjectURL(blob);

        if (clientMediaBlobs.size >= CLIENT_BLOB_MAX) {
          const oldest = clientMediaBlobs.keys().next().value;
          if (oldest) {
            const oldUrl = clientMediaBlobs.get(oldest);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            clientMediaBlobs.delete(oldest);
          }
        }
        clientMediaBlobs.set(key, obj);
        return obj;
      }
      return null;
    } catch {
      return null;
    } finally {
      warmInflight.delete(key);
    }
  })();

  warmInflight.set(key, task);
  return task;
}

const warmInflight = new Map<string, Promise<string | null>>();

export function prefetchMedia(
  paths: (string | null | undefined)[],
  limit = 8,
  eagerFirst = 2
): void {
  if (typeof window === "undefined") return;

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const path of paths) {
    if (ordered.length >= limit) break;
    const key = mediaCacheKey(path);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(path!);
  }

  ordered.slice(0, eagerFirst).forEach((path) => {
    void warmMediaBlob(path);
  });
  ordered.slice(eagerFirst).forEach((path, i) => {
    window.setTimeout(() => void warmMediaBlob(path), 80 * (i + 1));
  });
}

// ─── Discover feed snapshot (instant back-navigation) ─────────────────────────

export type FeedSnapshot = {
  cards: ProfileCard[];
  current: number;
  savedAt: number;
};

let feedSnapshot: FeedSnapshot | null = null;
const FEED_TTL_MS = 30 * 60 * 1000;

export function readFeedSnapshot(): FeedSnapshot | null {
  if (!feedSnapshot) return null;
  if (Date.now() - feedSnapshot.savedAt > FEED_TTL_MS) {
    feedSnapshot = null;
    return null;
  }
  const cards = filterSwipedCards(feedSnapshot.cards);
  if (cards.length === 0) return null;
  return {
    cards,
    current: Math.min(feedSnapshot.current, cards.length - 1),
    savedAt: feedSnapshot.savedAt,
  };
}

export function writeFeedSnapshot(cards: ProfileCard[], current: number): void {
  feedSnapshot = { cards, current, savedAt: Date.now() };
}

export function clearFeedSnapshot(): void {
  feedSnapshot = null;
}

function chatPhotoKey(roomId: string | number): string {
  return `lm_chat_photo_${roomId}`;
}

/** Avoid huge photo URLs in the address bar — stash before navigating to chat. */
export function stashChatPhoto(roomId: string | number, photo?: string | null): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeMediaInput(photo);
  if (!normalized) return;
  sessionStorage.setItem(chatPhotoKey(roomId), normalized);
}

/** Read stashed photo by room id and/or hashed user id. */
export function getChatPhoto(...keys: (string | number | null | undefined)[]): string | null {
  if (typeof window === "undefined") return null;
  for (const key of keys) {
    if (key == null || key === "") continue;
    const hit = normalizeMediaInput(sessionStorage.getItem(chatPhotoKey(key)));
    if (hit) return hit;
  }
  return null;
}

/** Parse a numeric chat room id (backend uses the same id for REST + WebSocket). */
export function parseNumericRoomId(
  value: string | number | null | undefined
): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value < 100000000 ? value : null;
  }
  const s = String(value).trim();
  if (!/^\d+$/.test(s)) return null;
  if (s.length >= 9) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function extractRoomIdFromMatchResponse(data: {
  room_id?: number | string | null;
  chatroom_id?: string | number | null;
  match_id?: number | string | null;
}): number | null {
  const fromRoom = parseNumericRoomId(data.room_id);
  if (fromRoom != null) return fromRoom;
  const fromMatch = parseNumericRoomId(data.match_id);
  if (fromMatch != null) return fromMatch;
  return parseNumericRoomId(data.chatroom_id);
}

/** Persist aliases (chatroom key, match card id) → numeric room_id. */
export function linkMatchRoomIds(
  roomId: number,
  aliases: (string | number | null | undefined)[]
): void {
  stashChatRoomId(String(roomId), roomId);
  for (const alias of aliases) {
    if (alias == null || alias === "") continue;
    const key = String(alias).trim();
    if (key && key !== String(roomId)) {
      stashChatRoomId(key, roomId);
    }
  }
}

export function resolveNumericRoomId(
  card: Pick<ProfileCard, "room_id" | "chatroom_id" | "id">
): number | null {
  if (card.room_id != null && Number.isFinite(card.room_id)) return card.room_id;
  const fromChatroom = card.chatroom_id
    ? parseNumericRoomId(card.chatroom_id)
    : null;
  if (fromChatroom != null) return fromChatroom;
  if (card.chatroom_id) {
    const stashed = getStashedChatRoomId(card.chatroom_id);
    if (stashed != null) return stashed;
  }
  return null;
}

export function resolveChatRoomFromParams(
  roomParam: string | null,
  chatroomParam: string | null
): number | null {
  if (chatroomParam) {
    const stashed = getStashedChatRoomId(chatroomParam);
    if (stashed != null) return stashed;
    const numeric = parseNumericRoomId(chatroomParam);
    if (numeric != null) return numeric;
  }
  if (roomParam) {
    const stashed = getStashedChatRoomId(roomParam);
    if (stashed != null) return stashed;
    return parseNumericRoomId(roomParam);
  }
  return null;
}

/** Load numeric room_id from matched list when the URL only has a chatroom alias. */
export async function bootstrapChatRoomId(
  userId: string,
  chatroomParam?: string | null
): Promise<number | null> {
  const res = await getMatchedList();
  if (!res.ok) return null;
  const match = parseProfileCards(res.data).find((m) => m.user_id === userId);
  if (!match) return null;
  const roomId = resolveNumericRoomId(match);
  if (roomId == null) return null;
  // Only alias room-scoped identifiers here — `match.id` is a generic
  // match/like-system row id (not chat-room-scoped) and can collide with
  // an unrelated match's numeric room id, corrupting room resolution.
  linkMatchRoomIds(roomId, [match.chatroom_id, chatroomParam]);
  return roomId;
}

/** In-memory peer context for chat — never put name/photo/user id in the URL. */
export interface ChatPeerContext {
  userId: string;
  name: string;
  photo: string | null;
  chatroomId?: string;
  roomId?: number;
}

const CHAT_PEER_KEY = "lm_chat_peer";

/** Stash match context before navigating to a clean `/chat/{roomId}` URL. */
export function stashChatPeer(card: ProfileCard): void {
  if (typeof window === "undefined") return;
  const roomId = resolveNumericRoomId(card);
  const photo = normalizeMediaInput(card.profile_photo);
  const peer: ChatPeerContext = {
    userId: card.user_id,
    name: card.name,
    photo,
    chatroomId: card.chatroom_id,
    roomId: roomId ?? undefined,
  };
  try {
    sessionStorage.setItem(CHAT_PEER_KEY, JSON.stringify(peer));
  } catch {
    // quota — best effort
  }
  if (roomId != null) stashChatPhoto(roomId, photo);
  stashChatPhoto(card.user_id, photo);
  stashChatPhoto(card.id, photo);
}

export function readChatPeer(): ChatPeerContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHAT_PEER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChatPeerContext;
  } catch {
    return null;
  }
}

/**
 * `readChatPeer()` is a single global slot that gets overwritten every time
 * any chat/call is opened. It must never be trusted for a room it doesn't
 * actually belong to — otherwise a stale peer from a previously-opened
 * conversation leaks into whatever room is currently being resolved
 * (wrong messages/name shown, wrong call routed, etc).
 */
export function peerMatchesRoom(
  peer: ChatPeerContext | null,
  roomId: string | number
): boolean {
  if (!peer) return false;
  const raw = String(roomId).trim();
  if (!raw) return false;
  if (peer.chatroomId && peer.chatroomId.trim() === raw) return true;
  if (peer.roomId != null && String(peer.roomId) === raw) return true;
  return false;
}

export async function findMatchByRoomId(
  roomId: number | string
): Promise<ProfileCard | null> {
  const res = await getMatchedList();
  if (!res.ok) return null;
  const cards = parseProfileCards(res.data);
  const s = String(roomId).trim();
  const numeric = /^\d+$/.test(s) ? Number(s) : null;
  return (
    cards.find((c) => {
      if (numeric !== null && resolveNumericRoomId(c) === numeric) return true;
      if (c.chatroom_id && String(c.chatroom_id).trim() === s) return true;
      if (c.user_id && String(c.user_id).trim() === s) return true;
      return false;
    }) ?? null
  );
}

export function buildVideoCallHref(roomId: number | string): string {
  return `/video-call/${roomId}`;
}

export function buildAudioCallHref(roomId: number | string): string {
  return `/video-call/${roomId}?audio=1`;
}

/** Chat URL — prefer chatroom UUID (matches REST + WebSocket). */
export function buildChatHref(card: ProfileCard): string {
  const chatroom = card.chatroom_id?.trim();
  if (chatroom) return `/chat/${chatroom}`;
  const roomId = resolveNumericRoomId(card);
  return roomId != null ? `/chat/${roomId}` : "/chat/pending";
}

/** Stable inbox / storage key — must match chatroom UUID used by the API. */
export function chatRoomKey(card: ProfileCard): string {
  const chatroom = card.chatroom_id?.trim();
  if (chatroom) return chatroom;
  const numeric = resolveNumericRoomId(card);
  if (numeric != null) return String(numeric);
  return String(card.id);
}

/** All WebSocket room ids for a match (numeric + chatroom UUID). */
export function callRoomIdsForMatch(card: ProfileCard): string[] {
  const ids = new Set<string>();
  const numeric = resolveNumericRoomId(card);
  if (numeric != null) ids.add(String(numeric));
  const chatroom = card.chatroom_id?.trim();
  if (chatroom) ids.add(chatroom);
  if (ids.size === 0) ids.add(String(card.id));
  return Array.from(ids);
}

// ─── Chat history (API + local fallback) ─────────────────────────────────────

export interface StoredChatMessage {
  id: number;
  from: "me" | "them";
  text: string;
  time: string;
  at: number;
  isRead?: boolean;
}

const CHAT_MSG_PREFIX = "lm_chat_msgs_";
const CHAT_ROOM_PREFIX = "lm_chat_room_";

function chatMsgKey(roomId: string | number): string {
  return `${CHAT_MSG_PREFIX}${roomId}`;
}

export function loadChatMessages(roomId: string | number): StoredChatMessage[] {
  const keys = chatStorageKeys(roomId);
  let merged: StoredChatMessage[] = [];
  for (const key of keys) {
    merged = mergeChatMessages(merged, readChatMessagesFromKey(key));
  }
  return merged;
}

export function saveChatMessages(
  roomId: string | number,
  messages: StoredChatMessage[]
): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(messages.slice(-200));
  try {
    for (const key of chatStorageKeys(roomId)) {
      localStorage.setItem(chatMsgKey(key), payload);
    }
  } catch {
    // quota exceeded — best effort
  }
}

/** Map chatroom alias → numeric room_id (from match list or POST /message/send). */
export function stashChatRoomId(chatroomId: string, roomId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${CHAT_ROOM_PREFIX}${chatroomId}`, String(roomId));
  } catch {
    // ignore
  }
}

export function getStashedChatRoomId(chatroomId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${CHAT_ROOM_PREFIX}${chatroomId}`);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Inbox storage key — prefer chatroom UUID so it matches the messages list sort key. */
export function resolveCanonicalInboxKey(roomId: string | number): string {
  const raw = String(roomId).trim();
  if (!raw) return raw;
  if (!/^\d+$/.test(raw)) return raw;

  const peer = readChatPeer();
  if (peerMatchesRoom(peer, raw) && peer?.chatroomId?.trim()) {
    return peer.chatroomId.trim();
  }

  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(CHAT_ROOM_PREFIX)) continue;
        if (localStorage.getItem(key) === raw) {
          return key.slice(CHAT_ROOM_PREFIX.length);
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  return raw;
}

/** Numeric room id for REST message APIs (send + history). */
export function resolveApiRoomId(roomId: string | number): number | null {
  const raw = String(roomId).trim();
  if (!raw) return null;

  const direct = parseNumericRoomId(raw);
  if (direct != null) return direct;

  const stashed = getStashedChatRoomId(raw);
  if (stashed != null) return stashed;

  const peer = readChatPeer();
  if (peerMatchesRoom(peer, raw)) {
    if (peer?.roomId != null && Number.isFinite(peer.roomId)) return peer.roomId;
    if (peer?.chatroomId) {
      const fromPeer = getStashedChatRoomId(peer.chatroomId);
      if (fromPeer != null) return fromPeer;
    }
  }

  return null;
}

/**
 * Chatroom identifier the message API expects.
 *
 * The backend keys chats on the `chatroom_id` UUID string (from matched/list),
 * NOT the numeric database id. `POST /message/send` and `GET /message/room/{id}`
 * both reject numeric ids ("Input should be a valid string" /
 * "Chatroom matching query does not exist"). The chat URL already carries this
 * UUID, so in the common case we return it as-is.
 */
export function chatroomIdForApi(roomId: string | number): string | null {
  const raw = String(roomId).trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return raw; // already the chatroom UUID
  // A numeric id was passed — recover the UUID from the current peer context,
  // but only if that peer actually belongs to this room.
  const peer = readChatPeer();
  if (peerMatchesRoom(peer, raw) && peer?.chatroomId) return peer.chatroomId;
  return raw;
}

function chatStorageKeys(roomId: string | number): string[] {
  const keys = new Set<string>();
  const raw = String(roomId).trim();
  if (raw) keys.add(raw);

  const peer = readChatPeer();
  if (peerMatchesRoom(peer, raw)) {
    if (peer?.chatroomId) keys.add(peer.chatroomId.trim());
    if (peer?.roomId != null) keys.add(String(peer.roomId));
  }

  const stashed = getStashedChatRoomId(raw);
  if (stashed != null) keys.add(String(stashed));

  const apiRoomId = resolveApiRoomId(roomId);
  if (apiRoomId != null) keys.add(String(apiRoomId));

  return Array.from(keys);
}

export function mergeChatMessages(
  ...lists: StoredChatMessage[][]
): StoredChatMessage[] {
  const map = new Map<number, StoredChatMessage>();
  for (const list of lists) {
    for (const msg of list) {
      map.set(msg.id, msg);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.at - b.at);
}

function readChatMessagesFromKey(key: string): StoredChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(chatMsgKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isHtmlError(text: string): boolean {
  const msg = text.trim();
  return (
    msg.startsWith("<") ||
    msg.includes("<!DOCTYPE") ||
    msg.includes("<html") ||
    msg.length > 280
  );
}

function cleanErrorText(text: string, fallback: string): string {
  return isHtmlError(text) ? fallback : text.trim();
}

export function extractError(
  data: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (typeof data === "string") {
    return cleanErrorText(data, fallback);
  }
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") {
    return cleanErrorText(obj.detail, fallback);
  }
  if (typeof obj.error === "string") {
    return cleanErrorText(obj.error, fallback);
  }
  if (typeof obj.message === "string") {
    return cleanErrorText(obj.message, fallback);
  }
  const first = Object.values(obj)[0];
  if (Array.isArray(first) && typeof first[0] === "string") {
    return cleanErrorText(first[0], fallback);
  }
  return fallback;
}

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

async function request<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; form?: FormData } = {}
): Promise<ApiResult<T>> {
  const { method = "GET", body, auth = false, form } = options;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };

  if (form) {
    init.body = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${PROXY}${path}`, init);
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        message: isHtmlError(text)
          ? "Request failed. Please try again."
          : text,
      };
    }
  }
  return { ok: res.ok, status: res.status, data: data as T };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateUserBody {
  phone_number: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  pin: string;
  confirm_pin: string;
}

export interface LoginResponse {
  token: string;
  user_id: number;
  message: string;
  date: string;
  profile_completed: boolean;
  full_name?: string;
  date_of_birth?: string;
  phone?: string;
  gender?: string;
  profile_image?: string | null;
  profile_image_one?: string | null;
  profile_image_two?: string | null;
}

export interface LoginProfileCache {
  profile_image: string | null;
  image1: string | null;
  image2: string | null;
  gender?: string;
  full_name?: string;
}

/** Map live login JSON (names, date_birth, profile_image_one, etc.) onto app fields. */
export function normalizeLoginResponse(raw: unknown): LoginResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const token = obj.token;
  if (typeof token !== "string" || token.length < 10) return null;

  const userIdRaw = obj.user_id;
  const user_id =
    typeof userIdRaw === "number"
      ? userIdRaw
      : typeof userIdRaw === "string" && /^\d+$/.test(userIdRaw)
        ? Number(userIdRaw)
        : decodeUserIdFromToken(token) ?? 0;

  return {
    token,
    user_id,
    message: String(obj.message ?? ""),
    date: String(obj.date ?? ""),
    profile_completed: obj.profile_completed === true,
    full_name:
      typeof obj.full_name === "string"
        ? obj.full_name
        : typeof obj.names === "string"
          ? obj.names
          : undefined,
    date_of_birth:
      typeof obj.date_of_birth === "string"
        ? obj.date_of_birth
        : typeof obj.date_birth === "string"
          ? obj.date_birth
          : undefined,
    phone: typeof obj.phone === "string" ? obj.phone : undefined,
    gender: typeof obj.gender === "string" ? obj.gender : undefined,
    profile_image: normalizeMediaInput(
      typeof obj.profile_image === "string" ? obj.profile_image : null
    ),
    profile_image_one: normalizeMediaInput(
      typeof obj.profile_image_one === "string"
        ? obj.profile_image_one
        : typeof obj.image1 === "string"
          ? obj.image1
          : null
    ),
    profile_image_two: normalizeMediaInput(
      typeof obj.profile_image_two === "string"
        ? obj.profile_image_two
        : typeof obj.image2 === "string"
          ? obj.image2
          : null
    ),
  };
}

export function loginProfileCacheFromResponse(
  login: LoginResponse
): LoginProfileCache | null {
  const cache: LoginProfileCache = {
    profile_image: login.profile_image ?? null,
    image1: login.profile_image_one ?? null,
    image2: login.profile_image_two ?? null,
    gender: login.gender,
    full_name: login.full_name,
  };
  if (
    !cache.profile_image &&
    !cache.image1 &&
    !cache.image2 &&
    !cache.gender &&
    !cache.full_name
  ) {
    return null;
  }
  return cache;
}

export function storeLoginProfileCache(cache: LoginProfileCache): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOGIN_PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota
  }
}

export function getLoginProfileCache(): LoginProfileCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOGIN_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LoginProfileCache;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      profile_image: parsed.profile_image ?? null,
      image1: parsed.image1 ?? null,
      image2: parsed.image2 ?? null,
      gender: parsed.gender,
      full_name: parsed.full_name,
    };
  } catch {
    return null;
  }
}

export interface LocalProfileDraft {
  full_name?: string;
  gender?: string;
  about_me?: string;
  location?: string;
  interests?: string;
  sexual_orientation?: string;
  religion?: string | null;
  profile_image: string | null;
  image1: string | null;
  image2: string | null;
  savedAt: number;
}

export function storeLocalProfileDraft(draft: LocalProfileDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PROFILE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // quota — best effort
  }
}

export function getLocalProfileDraft(): LocalProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalProfileDraft;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function isProfileAlreadyCompletedError(
  res: ApiResult<unknown>
): boolean {
  if (res.status !== 400 || !res.data || typeof res.data !== "object") {
    return false;
  }
  const msg = String((res.data as Record<string, unknown>).message ?? "").toLowerCase();
  return msg.includes("profile") && msg.includes("completed");
}

export function profileImageUrlsFromCache(
  cache: LoginProfileCache | null | undefined
): [string | null, string | null, string | null] {
  if (!cache) return [null, null, null];
  return [cache.profile_image, cache.image1, cache.image2];
}

export function profileImageUrlsFromDraft(
  draft: LocalProfileDraft | null | undefined
): [string | null, string | null, string | null] {
  if (!draft) return [null, null, null];
  return [draft.profile_image, draft.image1, draft.image2];
}

/** Backend returns 400 with a token when credentials are valid but profile is incomplete. */
export function isProfileIncompleteLogin(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const msg = String((data as Record<string, unknown>).message ?? "").toLowerCase();
  return msg.includes("profile") && msg.includes("complete");
}

export function parseIncompleteLoginToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const token = (data as Record<string, unknown>).token;
  return typeof token === "string" && token.length > 10 ? token : null;
}

export type InterpretedLogin =
  | { ok: true; data: LoginResponse; needsProfile: boolean }
  | { ok: false; message: string };

/** Normalize 200 logins and 400 incomplete-profile logins (token in body). */
export function interpretLoginResponse(res: ApiResult<LoginResponse>): InterpretedLogin {
  if (res.ok && res.data) {
    const data = normalizeLoginResponse(res.data) ?? (res.data as LoginResponse);
    if (data.token) {
      return {
        ok: true,
        data,
        needsProfile: data.profile_completed === false,
      };
    }
  }

  const token = parseIncompleteLoginToken(res.data);
  if (token && isProfileIncompleteLogin(res.data)) {
    const userId = decodeUserIdFromToken(token) ?? 0;
    const partial = normalizeLoginResponse(res.data);
    return {
      ok: true,
      data: partial ?? {
        token,
        user_id: userId,
        message: extractError(res.data, "Please complete your profile."),
        date: "",
        profile_completed: false,
      },
      needsProfile: true,
    };
  }

  return {
    ok: false,
    message: extractError(res.data, "Invalid phone number or PIN."),
  };
}

/** Persist session after login — captures optional profile fields from the response. */
export function persistLoginSession(
  loginData: LoginResponse,
  phone: string,
  extras?: Partial<SessionUser>
): void {
  const hash = extractHashedUserId(loginData);
  setSession(loginData.token, {
    userId: loginData.user_id,
    fullName: loginData.full_name ?? extras?.fullName,
    phone: loginData.phone ?? phone,
    dateOfBirth: loginData.date_of_birth ?? extras?.dateOfBirth,
    profileCompleted: loginData.profile_completed,
    hashedUserId: hash ?? extras?.hashedUserId,
  });
  if (hash) storeHashedUserId(hash);
  else if (typeof window !== "undefined") {
    // Drop any stale phone-number "hash" left from older app versions.
    try {
      const stale = window.localStorage.getItem(HASHED_USER_ID_KEY);
      if (stale && /^\d+$/.test(stale)) {
        window.localStorage.removeItem(HASHED_USER_ID_KEY);
      }
    } catch {
      // ignore
    }
  }

  const cache = loginProfileCacheFromResponse(loginData);
  if (cache) storeLoginProfileCache(cache);

  try {
    window.localStorage.removeItem("lm_chat_inbox");
    window.dispatchEvent(new Event("lm-inbox-change"));
  } catch {
    // ignore
  }
}

export interface ProfileCard {
  id: number;
  user_id: string; // hashed id — for GET /single/user/profile only
  name: string;
  location: string;
  age: number;
  profile_photo: string | null;
  chatroom_id?: string;
  /** Numeric room id for REST + WebSocket (same value per backend /chat/test/). */
  room_id?: number;
}

/** Map varying backend field names onto ProfileCard. */
export function normalizeProfileCard(raw: Record<string, unknown>): ProfileCard {
  const photo =
    (typeof raw.profile_photo === "string" && raw.profile_photo) ||
    (typeof raw.profile_image === "string" && raw.profile_image) ||
    (typeof raw.image === "string" && raw.image) ||
    null;

  const idRaw = raw.id ?? raw.match_id;
  const userRaw = raw.user_id ?? raw.swipe_user_id ?? raw.id;

  const chatroomRaw = raw.chatroom_id ?? raw.room_id;
  const chatroomId =
    typeof chatroomRaw === "string"
      ? chatroomRaw
      : typeof chatroomRaw === "number"
        ? String(chatroomRaw)
        : undefined;

  const roomId =
    parseNumericRoomId(raw.room_id as string | number | null | undefined) ??
    parseNumericRoomId(chatroomRaw as string | number | null | undefined);

  return {
    id: typeof idRaw === "number" ? idRaw : Number(idRaw) || 0,
    user_id: userRaw != null ? String(userRaw) : "",
    name: String(raw.name ?? raw.full_name ?? "User"),
    location: String(raw.location ?? ""),
    age: typeof raw.age === "number" ? raw.age : Number(raw.age) || 0,
    profile_photo: photo,
    chatroom_id: chatroomId,
    room_id: roomId ?? undefined,
  };
}

export function parseProfileCards(data: unknown): ProfileCard[] {
  if (!data) return [];
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as { items?: unknown; results?: unknown; data?: unknown }).items ??
        (data as { results?: unknown }).results ??
        (data as { data?: unknown }).data ??
        [])
      : [data];
  if (!Array.isArray(list)) return [];
  return list.map((item) =>
    normalizeProfileCard(
      item && typeof item === "object" ? (item as Record<string, unknown>) : {}
    )
  );
}

export interface SingleProfile {
  name: string;
  date_of_birth: number; // backend returns age here
  about_me: string;
  profile_image: string | null;
  image1?: string | null;
  image2?: string | null;
  location: string;
  religion: string | null;
  gender: string;
  sexual_orientation: string;
  interests: string;
}

export interface SwipeResponse {
  message?: string;
  error?: string;
  matched?: boolean;
  match_id?: number;
  chatroom_id?: string | number;
  room_id?: number;
}

export interface LikeResponse {
  matched: boolean;
  match_id?: number;
  chatroom_id?: string | number;
  room_id?: number;
}

export interface SendMessageResponse {
  message_id?: number;
  room_id?: string | number;
  sender_id?: string | number;
  text?: string;
  error?: string;
}

export interface ProfileUploadFields {
  sexual_orientation: string;
  gender: string;
  interests: string;
  about_me: string;
  location: string;
  show_location: boolean;
  profile_image: Blob;
  image1?: Blob | null;
  image2?: Blob | null;
  religion?: string;
  occupation?: string;
}

export interface Notification {
  id: number;
  message: string;
  header: string;
  created_at: string;
  is_read: boolean;
}

export interface PagedNotifications {
  items: Notification[];
  count: number;
}

/** Map backend `NotificationSchema` (`headers`, `read`) to app shape. */
export function normalizeNotification(raw: Record<string, unknown>): Notification {
  return {
    id: typeof raw.id === "number" ? raw.id : Number(raw.id) || 0,
    message: String(raw.message ?? ""),
    header: String(raw.headers ?? raw.header ?? "Notification"),
    created_at: String(raw.created_at ?? ""),
    is_read: raw.read === true || raw.is_read === true,
  };
}

export function parseNotificationList(data: unknown): PagedNotifications {
  if (!data || typeof data !== "object") {
    return { items: [], count: 0 };
  }
  const obj = data as { items?: unknown; count?: unknown };
  const items = Array.isArray(obj.items)
    ? obj.items.map((item) =>
        normalizeNotification(
          item && typeof item === "object" ? (item as Record<string, unknown>) : {}
        )
      )
    : [];
  return {
    items,
    count: typeof obj.count === "number" ? obj.count : items.length,
  };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export function createUser(body: CreateUserBody) {
  return request("/create/user", { method: "POST", body });
}

export function loginUser(number: string, pin: string) {
  return request<LoginResponse>("/login/user", {
    method: "POST",
    body: { number, pin },
  });
}

export function forgetPassword(phone_number: string) {
  return request<LoginResponse>("/forgot/password/", { 
    method: "POST",
    body: { phone_number},
  });
}

export function verifyForgotPasswordOTP(phone_number: string, pin: string) {
  return request<LoginResponse>("/reset/password/", { 
    method: "POST",
    body: { phone_number, pin},
  });
}

export function uploadProfile(fields: ProfileUploadFields) {
  const form = new FormData();
  form.append("sexual_orientation", fields.sexual_orientation);
  form.append("gender", fields.gender);
  form.append("interests", fields.interests);
  form.append("about_me", fields.about_me);
  form.append("location", fields.location);
  form.append("show_location", String(fields.show_location));
  form.append("religion", fields.religion?.trim() || "Not specified");
  form.append("occupation", fields.occupation?.trim() || "Not specified");
  form.append("profile_image", fields.profile_image, "profile.jpg");
  if (fields.image1) form.append("image1", fields.image1, "image1.jpg");
  if (fields.image2) form.append("image2", fields.image2, "image2.jpg");
  return request("/update_reg/profile", { method: "POST", form, auth: true });
}

/** Photo-only update for completed profiles — API requires all 3 image files. */
export function uploadProfileImages(images: {
  profile_image: Blob;
  image1: Blob;
  image2: Blob;
}) {
  const form = new FormData();
  form.append("profile_image", images.profile_image, "profile.jpg");
  form.append("image1", images.image1, "image1.jpg");
  form.append("image2", images.image2, "image2.jpg");
  return request("/update_user/image", { method: "POST", form, auth: true });
}

export type SaveAccountProfileInput = ProfileUploadFields & {
  fullName?: string;
  photoUrls?: [string | null, string | null, string | null];
};

export type SaveAccountProfileResult =
  | { ok: true; localOnly?: false }
  | { ok: true; localOnly: true }
  | { ok: false; error: string };

/**
 * Save profile from the account screen.
 * Tries full update, then photo-only update; if the server blocks completed
 * profiles, persists a local draft so the UI still reflects user edits.
 */
export async function saveAccountProfile(
  fields: SaveAccountProfileInput
): Promise<SaveAccountProfileResult> {
  const full = await uploadProfile(fields);
  if (full.ok || full.status === 500) {
    return { ok: true };
  }

  if (isProfileAlreadyCompletedError(full)) {
    const image1 = fields.image1 ?? fields.profile_image;
    const image2 = fields.image2 ?? fields.profile_image;
    const photos = await uploadProfileImages({
      profile_image: fields.profile_image,
      image1,
      image2,
    });
    if (photos.ok) {
      return { ok: true };
    }

    const urls = fields.photoUrls ?? [null, null, null];
    storeLocalProfileDraft({
      full_name: fields.fullName,
      gender: fields.gender,
      about_me: fields.about_me,
      location: fields.location,
      interests: fields.interests,
      sexual_orientation: fields.sexual_orientation,
      religion: fields.religion ?? null,
      profile_image: urls[0],
      image1: urls[1],
      image2: urls[2],
      savedAt: Date.now(),
    });
    storeLoginProfileCache({
      profile_image: urls[0],
      image1: urls[1],
      image2: urls[2],
      gender: fields.gender,
      full_name: fields.fullName,
    });
    if (fields.fullName?.trim()) {
      updateUser({ fullName: fields.fullName.trim() });
    }
    return { ok: true, localOnly: true };
  }

  return {
    ok: false,
    error: extractError(full.data, "Could not save your profile."),
  };
}

export interface FeedFilters {
  min_age?: number;
  max_age?: number;
  religion?: string;
  gender?: string;
  interests?: string;
}

export interface DiscoverPreferences {
  min_age: number;
  max_age: number;
  religion: string;
}

const PREFS_KEY = "lm_discover_prefs";

const DEFAULT_PREFS: DiscoverPreferences = {
  min_age: 18,
  max_age: 40,
  religion: "",
};

export function loadDiscoverPreferences(): DiscoverPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<DiscoverPreferences>;
    return {
      min_age: parsed.min_age ?? DEFAULT_PREFS.min_age,
      max_age: parsed.max_age ?? DEFAULT_PREFS.max_age,
      religion: parsed.religion ?? DEFAULT_PREFS.religion,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function storeDiscoverPreferences(prefs: DiscoverPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

/** Onboarding stored user religion in discover prefs by mistake — strip it. */
export function sanitizeDiscoverPrefs(): DiscoverPreferences {
  const prefs = loadDiscoverPreferences();
  if (typeof window === "undefined") return prefs;
  try {
    const userReligion = localStorage.getItem(USER_RELIGION_KEY);
    if (userReligion && prefs.religion === userReligion) {
      const fixed = { ...prefs, religion: "" };
      storeDiscoverPreferences(fixed);
      return fixed;
    }
  } catch {
    // ignore
  }
  return prefs;
}

export type DiscoverEmptyReason =
  | "incomplete_profile"
  | "empty_pool"
  | "all_swiped"
  | null;

export type DiscoverFeedResult = {
  ok: boolean;
  cards: ProfileCard[];
  error?: string;
  notice?: string;
  emptyReason?: DiscoverEmptyReason;
  /** Discoverable profiles returned by the API (before local swipe hiding). */
  platformUserCount?: number;
};

/** True when the backend has a usable profile (name, gender, photo). */
export async function verifyProfileOnBackend(): Promise<boolean> {
  const result = await fetchMyProfile();
  if (!result.ok || !result.profile) {
    const user = getUser();
    return user?.profileCompleted ?? false;
  }
  const p = result.profile;
  return Boolean(
    p.name?.trim() && p.gender?.trim() && p.profile_image?.trim()
  );
}

/** Reconcile local `profileCompleted` with what the API actually has. */
export async function syncProfileCompletedFromBackend(): Promise<boolean> {
  const ready = await verifyProfileOnBackend();
  updateUser({ profileCompleted: ready });
  return ready;
}

/** Load discover feed — age filters only (religion filter disabled until backend supports it). */
export async function fetchDiscoverFeed(): Promise<DiscoverFeedResult> {
  const prefs = sanitizeDiscoverPrefs();
  if (prefs.religion) {
    storeDiscoverPreferences({ ...prefs, religion: "" });
  }

  const ageFilters: FeedFilters = { min_age: prefs.min_age, max_age: prefs.max_age };

  const load = async (filters?: FeedFilters) => {
    const res = await getFeed(filters);
    const all = res.ok ? parseProfileCards(res.data) : [];
    const cards = filterSwipedCards(all);
    return { res, all, cards };
  };

  const { res, cards } = await load(ageFilters);

  if (!res.ok) {
    return {
      ok: false,
      cards: [],
      error: extractError(res.data, "Could not load profiles. Try again."),
    };
  }

  if (cards.length === 0) {
    const bare = await load();
    if (bare.cards.length > 0) {
      return {
        ok: true,
        cards: bare.cards,
        notice: "Showing all available profiles (age filter had no matches).",
        platformUserCount: bare.all.length,
      };
    }

    const platformUserCount = bare.all.length;
    const visibleAfterSwipe = bare.cards.length;
    const profileReady = await syncProfileCompletedFromBackend();

    if (!profileReady) {
      return {
        ok: true,
        cards: [],
        emptyReason: "incomplete_profile",
        platformUserCount,
        notice: "Finish setting up your profile to appear in Discover.",
      };
    }

    if (platformUserCount === 0) {
      return {
        ok: true,
        cards: [],
        emptyReason: "empty_pool",
        platformUserCount: 0,
      };
    }

    if (visibleAfterSwipe === 0) {
      return {
        ok: true,
        cards: [],
        emptyReason: "all_swiped",
        platformUserCount,
      };
    }

    return {
      ok: true,
      cards: [],
      emptyReason: "empty_pool",
      platformUserCount,
      notice:
        "No profiles match your filters right now. Try resetting filters or check back later.",
    };
  }

  return { ok: true, cards, platformUserCount: cards.length };
}

export function getFeed(filters?: FeedFilters) {
  const params = new URLSearchParams();
  if (filters?.min_age != null) params.set("min_age", String(filters.min_age));
  if (filters?.max_age != null) params.set("max_age", String(filters.max_age));
  if (filters?.religion) params.set("religion", filters.religion);
  if (filters?.gender) params.set("gender", filters.gender);
  if (filters?.interests) params.set("interests", filters.interests);
  const qs = params.toString();
  return request<ProfileCard[]>(`/feed${qs ? `?${qs}` : ""}`, { auth: true });
}

export function getDiscoverPreferences() {
  return request<DiscoverPreferences>("/preferences", { auth: true });
}

export function saveDiscoverPreferences(prefs: DiscoverPreferences) {
  return request<DiscoverPreferences>("/preferences", {
    method: "POST",
    body: prefs,
    auth: true,
  });
}

export function getInterests() {
  return request<string[] | { interests?: string[] }>("/interests", { auth: true });
}

export interface ApiChatMessage {
  id?: number;
  message_id?: number;
  message?: string;
  text?: string;
  sender_id?: number;
  user_id?: number;
  is_mine?: boolean;
  is_sender?: boolean;
  is_read?: boolean;
  created_at?: string;
  timestamp?: string;
}

export function parseApiChatMessages(data: unknown): StoredChatMessage[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as { messages?: unknown; items?: unknown }).messages ??
        (data as { items?: unknown }).items ??
        [])
      : [];

  if (!Array.isArray(list)) return [];

  return list
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;
      const m = raw as ApiChatMessage;
      const text = m.message ?? m.text ?? "";
      if (!text.trim()) return null;

      const senderId = m.sender_id ?? m.user_id;
      const from: StoredChatMessage["from"] =
        m.is_mine === true || m.is_sender === true
          ? "me"
          : m.is_mine === false || m.is_sender === false
            ? "them"
            : isOwnSenderId(senderId)
              ? "me"
              : "them";

      const atRaw = m.created_at ?? m.timestamp;
      const at = atRaw ? new Date(atRaw).getTime() : Date.now() + index;
      const time = Number.isFinite(at)
        ? new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : nowTimeLabel();

      const message: StoredChatMessage = {
        id: m.id ?? m.message_id ?? at + index,
        from,
        text,
        time,
        at: Number.isFinite(at) ? at : Date.now() + index,
      };
      if (typeof m.is_read === "boolean") {
        message.isRead = m.is_read;
      }
      return message;
    })
    .filter((m): m is StoredChatMessage => m != null)
    .sort((a, b) => a.at - b.at);
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function getMessageList(roomId: number | string, page = 1) {
  const apiRoomId = chatroomIdForApi(roomId) ?? String(roomId).trim();
  return request<unknown>(
    `/message/room/${encodeURIComponent(apiRoomId)}?page=${page}`,
    { auth: true }
  );
}

/** Mark one notification read — `GET /notification/read?notification_id=` */
export function markNotificationRead(id: number) {
  const params = new URLSearchParams({ notification_id: String(id) });
  return request(`/notification/read?${params}`, { auth: true });
}

export function getSingleProfile(userId: string) {
  return request<{ profile: SingleProfile }>(
    `/single/user/profile?user_id=${encodeURIComponent(userId)}`,
    { method: "PUT", auth: true }
  );
}

export function normalizeSingleProfile(raw: Record<string, unknown>): SingleProfile {
  const dobRaw = raw.date_of_birth;
  let dateOfBirth = 0;
  if (typeof dobRaw === "number") dateOfBirth = dobRaw;
  else if (typeof dobRaw === "string" && /^\d{1,3}$/.test(dobRaw.trim())) {
    dateOfBirth = Number(dobRaw);
  }

  return {
    name: String(raw.name ?? raw.full_name ?? ""),
    date_of_birth: dateOfBirth,
    about_me: String(raw.about_me ?? ""),
    profile_image: normalizeMediaInput(
      typeof raw.profile_image === "string"
        ? raw.profile_image
        : typeof raw.profile_photo === "string"
          ? raw.profile_photo
          : null
    ),
    image1: normalizeMediaInput(
      typeof raw.image1 === "string"
        ? raw.image1
        : typeof raw.profile_image_one === "string"
          ? raw.profile_image_one
          : null
    ),
    image2: normalizeMediaInput(
      typeof raw.image2 === "string"
        ? raw.image2
        : typeof raw.profile_image_two === "string"
          ? raw.profile_image_two
          : null
    ),
    location: String(raw.location ?? ""),
    religion: raw.religion != null ? String(raw.religion) : null,
    gender: String(raw.gender ?? ""),
    sexual_orientation: String(raw.sexual_orientation ?? ""),
    interests: String(raw.interests ?? ""),
  };
}

async function tryLoadSingleProfile(
  userId: string,
  opts?: { persistHash?: boolean }
): Promise<SingleProfile | null> {
  const res = await getSingleProfile(userId);
  if (!res.ok || !res.data) return null;
  const wrapped = res.data as Record<string, unknown>;
  const raw =
    wrapped.profile && typeof wrapped.profile === "object"
      ? (wrapped.profile as Record<string, unknown>)
      : wrapped;
  if (!raw.name && !raw.gender && !raw.about_me && !raw.profile_image) return null;
  // Only persist real hashed ids — never phone tails / numeric swipe ids.
  const looksHashed = !/^\d+$/.test(userId) && userId.length >= 8;
  if (opts?.persistHash !== false && looksHashed) {
    storeHashedUserId(userId);
  }
  return normalizeSingleProfile(raw);
}

function namesCompatible(a?: string | null, b?: string | null): boolean {
  const na = (a ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const nb = (b ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!na || !nb) return true;
  if (na === nb) return true;
  const aParts = na.split(" ");
  const bParts = nb.split(" ");
  return aParts[0] === bParts[0];
}

/** True when a fetched profile name matches the signed-in session name. */
export function profileMatchesSession(
  profileName?: string | null,
  sessionName?: string | null
): boolean {
  const session = (sessionName ?? getUser()?.fullName ?? "").trim();
  if (!session) return true;
  return namesCompatible(session, profileName);
}

export function clearLoginProfileCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOGIN_PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Drop a hashed id that resolved someone else's profile. */
export function clearStoredHashedUserId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HASHED_USER_ID_KEY);
  } catch {
    // ignore
  }
  const user = getUser();
  if (user?.hashedUserId) {
    const { hashedUserId: _drop, ...rest } = user;
    setSession(getToken() ?? "", rest);
  }
}

/** Fetch the signed-in user's profile via GET /single/user/profile. */
export async function fetchMyProfile(): Promise<{
  ok: boolean;
  profile: SingleProfile | null;
  error?: string;
}> {
  const user = getUser();
  if (!user) return { ok: false, profile: null, error: "Not signed in." };

  const candidates: string[] = [];
  const push = (id?: string | null) => {
    const v = (id ?? "").trim();
    if (!v || candidates.includes(v)) return;
    // Never use phone numbers as profile ids — they resolve other users' public profiles.
    if (/^\d{7,}$/.test(v)) return;
    candidates.push(v);
  };

  push(getStoredHashedUserId());
  push(user.hashedUserId);

  const token = getToken();
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          typeof window !== "undefined"
            ? window.atob(parts[1])
            : Buffer.from(parts[1], "base64").toString("utf-8")
        ) as Record<string, unknown>;
        for (const key of ["user_hash", "hash", "uuid", "profile_id", "hashed_user_id"]) {
          const v = payload[key];
          if (typeof v === "string") push(v);
        }
      }
    } catch {
      // ignore bad jwt
    }
  }

  // Only trust the session name — never the possibly-poisoned login photo cache.
  const sessionName = (user.fullName ?? "").trim();

  for (const id of candidates) {
    const profile = await tryLoadSingleProfile(id, { persistHash: false });
    if (!profile) continue;
    if (sessionName && !namesCompatible(sessionName, profile.name)) {
      // Wrong person resolved from a stale hash — drop it and keep looking.
      if (getStoredHashedUserId() === id) clearStoredHashedUserId();
      continue;
    }
    const looksHashed = !/^\d+$/.test(id) && id.length >= 8;
    if (looksHashed) storeHashedUserId(id);
    return { ok: true, profile };
  }

  // Last resort only when we have no session name to verify against.
  if (!sessionName) {
    for (const id of candidates) {
      const profile = await tryLoadSingleProfile(id, { persistHash: false });
      if (profile) {
        const looksHashed = !/^\d+$/.test(id) && id.length >= 8;
        if (looksHashed) storeHashedUserId(id);
        return { ok: true, profile };
      }
    }
  }

  return {
    ok: false,
    profile: null,
    error: "Could not load your profile. Basic account info is shown below.",
  };
}

/** Download a profile image for multipart re-upload on update. */
export async function fetchMediaBlob(path?: string | null): Promise<Blob | null> {
  const url = mediaUrl(path) ?? directMediaUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export function swipe(userId: string, type: "like" | "pass") {
  return request<SwipeResponse>("/swipe", {
    method: "POST",
    body: { user_id: userId, swipe_type: type },
    auth: true,
  });
}

/**
 * `user_id` for POST /swipe.
 * Feed cards: long numeric string on `user_id` (e.g. "8099448551").
 * Like-list cards: short numeric `id` when `user_id` is a hash.
 */
export function swipeTargetId(card: ProfileCard): string {
  const uid = card.user_id?.trim();
  if (uid && /^\d+$/.test(uid)) return uid;
  return String(card.id);
}

/** Numeric `id` for POST /like (liked-you list). */
export function profileNumericId(card: Pick<ProfileCard, "id">): string {
  return String(card.id);
}

/** Discover feed — swipe right (like) or left (pass). */
export function swipeProfile(card: ProfileCard, type: "like" | "pass") {
  return swipe(swipeTargetId(card), type);
}

/** “Liked you” — they already liked you; you like back to match. */
export function likeBack(card: ProfileCard) {
  return likeUser(profileNumericId(card));
}

// ─── Swiped discover profiles (survives refresh) ───────────────────────────────

const SWIPED_KEY = "lm_swiped_targets";

export function getSwipedTargetIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SWIPED_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export function markSwipedTarget(targetId: string): void {
  if (typeof window === "undefined") return;
  const set = getSwipedTargetIds();
  set.add(targetId);
  localStorage.setItem(SWIPED_KEY, JSON.stringify(Array.from(set)));
}

export function markSwipedCard(card: ProfileCard): void {
  markSwipedTarget(swipeTargetId(card));
}

export function filterSwipedCards(cards: ProfileCard[]): ProfileCard[] {
  const seen = getSwipedTargetIds();
  return cards.filter((c) => !seen.has(swipeTargetId(c)));
}

export function likeUser(userId: string) {
  return request<LikeResponse>("/like", {
    method: "POST",
    body: { user_id: userId },
    auth: true,
  });
}

export function getLikeList() {
  return request<ProfileCard[]>("/like/list", { auth: true });
}

export function getMatchedList() {
  return request<ProfileCard[] | ProfileCard>("/matched/list", { auth: true });
}

export async function sendMessage(
  message: string,
  roomId: string | number
) {
  let apiRoomId = chatroomIdForApi(roomId);

  // Only a numeric id is known — look up the chatroom UUID from matches.
  if (apiRoomId == null || /^\d+$/.test(apiRoomId)) {
    const match = await findMatchByRoomId(roomId);
    if (match?.chatroom_id) apiRoomId = String(match.chatroom_id);
  }

  if (apiRoomId == null) {
    return {
      ok: false,
      status: 400,
      data: { error: "Chat room not ready. Go back and reopen the conversation." },
    } as ApiResult<SendMessageResponse>;
  }

  return request<SendMessageResponse>("/message/send", {
    method: "POST",
    body: {
      message,
      room_id: apiRoomId,
      reply_to: null,
    },
    auth: true,
  });
}

export async function getNotificationList(page = 1, pageSize?: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize != null) params.set("page_size", String(pageSize));
  const res = await request<unknown>(`/notification/list?${params}`, { auth: true });
  if (!res.ok) return res as ApiResult<PagedNotifications>;
  return { ...res, data: parseNotificationList(res.data) };
}

export function resetPassword(phone_number: string, pin: string) {
  return request<unknown>("/reset/password/", {
    method: "POST",
    body: { phone_number, pin },
  });
}

export function updatePassword(number: string, pin: string, confirm_pin: string) {
  try {
    return request<unknown>("/update/password/", {
      method: "POST",
      body: { number, pin, confirm_pin },
    });
  } catch (error) {
    console.log(error)
  }
}

/** Authenticated PIN change (settings → Change PIN). */
export function changePassword(old_pin: string, new_pin: string) {
  return request<unknown>("/change/password", {
    method: "POST",
    body: { old_pin, new_pin },
    auth: true,
  });
}
