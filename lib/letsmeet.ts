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
  const pageIsHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  // IMPORTANT: `wss:` must stay `wss:` — the old check only handled `https:`
  // and rewrote env values like `wss://mtn.lenhub.net` into `ws://`, which
  // browsers block on HTTPS pages (mixed content → SecurityError crash).
  if (
    url.protocol === "https:" ||
    url.protocol === "wss:" ||
    pageIsHttps
  ) {
    url.protocol = "wss:";
  } else {
    url.protocol = "ws:";
  }
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7616/ingest/9fe77331-a7ce-4551-804b-6693f2cfc1bd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "49bb0d",
      },
      body: JSON.stringify({
        sessionId: "49bb0d",
        location: "letsmeet.ts:getLetsMeetWsOrigin",
        message: "ws origin resolved",
        data: {
          raw,
          pageProtocol:
            typeof window !== "undefined" ? window.location.protocol : null,
          origin: url.origin,
        },
        timestamp: Date.now(),
        hypothesisId: "A",
        runId: "ws-fix",
      }),
    }).catch(() => {});
  }
  // #endregion
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

/** Open a WebSocket without letting SecurityError crash the React tree. */
export function openLetsMeetWebSocket(url: string): WebSocket | null {
  try {
    return new WebSocket(url);
  } catch (err) {
    console.error("WebSocket open failed:", url, err);
    return null;
  }
}

// ─── Session storage ──────────────────────────────────────────────────────────

const TOKEN_KEY = "lm_token";
const USER_KEY = "lm_user";
const LOGIN_PROFILE_CACHE_KEY = "lm_login_profile_cache";
/** Survives logout so About Me / interests survive re-login on this device. */
const PROFILE_EXTRAS_BY_PHONE_KEY = "lm_profile_extras_by_phone";
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

/** Max length for opaque profile / swipe ids from the LetsMeet API. */
export const OPAQUE_USER_ID_MAX_LEN = 50;

/** True for hashed profile ids or long numeric swipe ids (not JWT internal ids). */
export function isOpaqueUserId(value: string | null | undefined): boolean {
  const text = (value ?? "").trim();
  if (!text || text.length > OPAQUE_USER_ID_MAX_LEN) return false;
  if (/^\d+$/.test(text)) return text.length >= 8;
  return true;
}

/** Valid API target for swipe/like/profile — rejects internal list row ids (1, 2, 3…). */
export function isApiUserId(value: string | null | undefined): boolean {
  const text = (value ?? "").trim();
  if (!text || !isOpaqueUserId(text)) return false;
  if (/^\d{1,7}$/.test(text)) return false;
  return true;
}

function pickApiUserId(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = value?.trim();
    if (text && isApiUserId(text)) return text;
  }
  return "";
}

/** 32-char hex profile id — not a chat room id (WS/REST reject it). */
export function isBareProfileHash(value: string | null | undefined): boolean {
  const text = (value ?? "").trim();
  return /^[0-9a-f]{32}$/i.test(text);
}

/** Profile detail URL — always passes hash `id` + swipe `uid`, never list row `id`. */
export function profileSingleHref(
  card: Pick<ProfileCard, "user_id" | "swipe_user_id">,
  source = "discover"
): string {
  const profileId = pickApiUserId(card.user_id, card.swipe_user_id);
  if (!profileId) return "/profile-single";
  const swipeId = pickApiUserId(card.swipe_user_id, card.user_id) || profileId;
  const q = new URLSearchParams({ id: profileId, uid: swipeId, source });
  return `/profile-single?${q}`;
}

/** Profile lookup id for PUT /single/user/profile (hash or numeric user_id). */
export function extractHashedUserId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  for (const key of ["hashed_user_id", "profile_user_id", "uuid", "user_hash"]) {
    const v = obj[key];
    if (typeof v === "string" && isOpaqueUserId(v) && !/^\d+$/.test(v)) return v.trim();
  }
  const uid = obj.user_id;
  if (typeof uid === "string" && isOpaqueUserId(uid) && !/^\d+$/.test(uid)) return uid.trim();
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
  const sessionPhone = normalizePhone(user?.phone ?? "");

  const isPhoneDisguised = (value: string) => {
    if (!sessionPhone || !/^\d+$/.test(value)) return false;
    return (
      value === sessionPhone ||
      value.endsWith(sessionPhone) ||
      sessionPhone.endsWith(value)
    );
  };

  const fromUser = user?.hashedUserId?.trim();
  if (fromUser && !isPhoneDisguised(fromUser)) return fromUser;

  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(HASHED_USER_ID_KEY)?.trim();
    if (!stored) return null;
    if (isPhoneDisguised(stored)) {
      // Legacy bug: phone numbers were stored as profile lookup ids.
      window.localStorage.removeItem(HASHED_USER_ID_KEY);
      return null;
    }
    return stored;
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

const OWN_SENDER_KEY = "lm_own_sender_ids";

function chatOwnerScopeKey(): string {
  const hash = getUser()?.hashedUserId?.trim() || getStoredHashedUserId()?.trim();
  if (hash && !/^\d{1,6}$/.test(hash)) return hash;
  const jwt = getNumericUserId();
  if (jwt != null && jwt > 0) return `u${jwt}`;
  const uid = getUser()?.userId;
  if (uid != null && uid > 0) return `u${uid}`;
  const phone = normalizePhone(getUser()?.phone ?? "");
  return phone || "anon";
}

function ownSenderStorageKey(): string {
  return `${OWN_SENDER_KEY}_${chatOwnerScopeKey()}`;
}

/** Remember ids the API uses for our outbound chat messages (hash or JWT id). */
export function rememberOwnSenderId(senderId: string | number | null | undefined): void {
  if (typeof window === "undefined" || senderId == null) return;
  const text = String(senderId).trim();
  if (!text) return;
  try {
    const raw = localStorage.getItem(ownSenderStorageKey());
    let list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    const isNumeric = /^\d{1,7}$/.test(text);
    if (isNumeric) {
      // One internal numeric sender id per account — never store both "1" and "2".
      list = list.filter((id) => !/^\d{1,7}$/.test(id));
    }
    if (!list.includes(text)) list.push(text);
    localStorage.setItem(ownSenderStorageKey(), JSON.stringify(list.slice(-24)));
  } catch {
    // ignore
  }
  if (/^[0-9a-f]{32}$/i.test(text) && !/^\d{1,6}$/.test(text)) {
    storeHashedUserId(text);
    updateUser({ hashedUserId: text });
  }
}

function readOwnSenderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ownSenderStorageKey());
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(list)) return [];
    const cleaned = list.filter((id) => typeof id === "string" && id.trim());
    const hashes = cleaned.filter((id) => /^[0-9a-f]{32}$/i.test(id));
    const numerics = cleaned.filter((id) => /^\d{1,7}$/.test(id));
    if (numerics.length > 1) {
      // Self-heal corrupted state where both chat participants' numeric ids were stored.
      const healed = [...hashes];
      localStorage.setItem(ownSenderStorageKey(), JSON.stringify(healed));
      return healed;
    }
    return cleaned;
  } catch {
    return [];
  }
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
  const hash = user?.hashedUserId?.trim() || getStoredHashedUserId();
  if (hash) candidates.add(hash);
  for (const id of readOwnSenderIds()) candidates.add(id);
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

function resolveMessageFrom(
  senderId: unknown,
  peerUserId: string | null,
  flags: { is_mine?: boolean; is_sender?: boolean }
): "me" | "them" {
  if (flags.is_mine === true || flags.is_sender === true) return "me";
  if (flags.is_mine === false || flags.is_sender === false) return "them";
  if (isOwnSenderId(senderId as string | number)) return "me";
  const senderKey =
    senderId != null && String(senderId).trim() ? String(senderId).trim() : "";
  const peerKey = peerUserId?.trim() || "";
  if (peerKey && senderKey === peerKey) return "them";
  if (senderKey && /^\d{1,7}$/.test(senderKey)) {
    const ownNumerics = readOwnSenderIds().filter((id) => /^\d{1,7}$/.test(id));
    if (ownNumerics.length === 1) {
      return senderKey === ownNumerics[0] ? "me" : "them";
    }
    return "them";
  }
  return "them";
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

/** Reset age/religion filters and in-memory feed cache — keeps swipe history. */
export function resetDiscoverFilters(): void {
  clearFeedSnapshot();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      "lm_discover_prefs",
      JSON.stringify({ min_age: 18, max_age: 40, religion: "" })
    );
  } catch {
    // ignore
  }
}

/** Full discover reset — call on sign-up / logout only (not routine sign-in). */
export function resetDiscoverLocalState(): void {
  clearFeedSnapshot();
  invalidateSwipedHydrateCache();
  if (typeof window === "undefined") return;
  try {
    const uid = getUser()?.userId;
    localStorage.removeItem(swipedStorageKey());
    if (uid) localStorage.removeItem(`lm_swiped_v2_${uid}`);
    localStorage.removeItem(SWIPED_KEY);
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
      if (
        u.hostname === "letsmeet.com.ng" ||
        u.hostname === "mtn.lenhub.net" ||
        u.hostname === "mtnstaging.lenhub.net"
      ) {
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
  const fromChatroom = parseNumericRoomId(data.chatroom_id);
  if (fromChatroom != null) return fromChatroom;
  const fromRoom = parseNumericRoomId(data.room_id);
  if (fromRoom != null) return fromRoom;
  // `match_id` is the list-row id for unmatch — not a chat room id.
  return null;
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
  if (card.room_id != null && Number.isFinite(card.room_id)) {
    if (card.id > 0 && card.room_id === card.id) return null;
    return card.room_id;
  }
  const fromChatroom = card.chatroom_id
    ? parseNumericRoomId(card.chatroom_id)
    : null;
  if (fromChatroom != null) {
    if (card.id > 0 && fromChatroom === card.id) return null;
    return fromChatroom;
  }
  if (card.chatroom_id) {
    const stashed = getStashedChatRoomId(card.chatroom_id);
    if (stashed != null) {
      if (card.id > 0 && stashed === card.id) return null;
      return stashed;
    }
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
  const res = await fetchMatchedListCached();
  const match = res.find((m) => m.user_id === userId);
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
  matchId?: string;
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
    matchId: matchIdForUnmatch(card) ?? undefined,
  };
  try {
    sessionStorage.setItem(CHAT_PEER_KEY, JSON.stringify(peer));
  } catch {
    // quota — best effort
  }
  if (roomId != null) stashChatPhoto(roomId, photo);
  stashChatPhoto(card.user_id, photo);
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
  if (peer.userId && peer.userId.trim() === raw) return true;
  return false;
}

export async function findMatchByRoomId(
  roomId: number | string
): Promise<ProfileCard | null> {
  const cards = await fetchMatchedListCached();
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

/** Resolve chat/call signaling room id (chatroom hash preferred). */
export async function resolveCallRoomId(
  roomId: string | number
): Promise<string | null> {
  return resolveMessageRoomId(roomId);
}

/** Chat URL — uses API `chatroom_id` (often the peer's profile hash). */
export function buildChatHref(card: ProfileCard): string {
  const chatroom = card.chatroom_id?.trim();
  if (chatroom) return `/chat/${chatroom}`;
  const numeric = resolveNumericRoomId(card);
  if (numeric != null) return `/chat/${numeric}`;
  return "/chat/pending";
}

/** Stable inbox / storage key — matches API `chatroom_id`. */
export function chatRoomKey(card: ProfileCard): string {
  const chatroom = card.chatroom_id?.trim();
  if (chatroom) return chatroom;
  const numeric = resolveNumericRoomId(card);
  if (numeric != null) return String(numeric);
  return "";
}

/** All call/signaling room ids for a match (chatroom hash + numeric room). */
export function callRoomIdsForMatch(card: ProfileCard): string[] {
  const ids = new Set<string>();
  const chatroom = card.chatroom_id?.trim();
  if (chatroom) ids.add(chatroom);
  const numeric = resolveNumericRoomId(card);
  if (numeric != null) ids.add(String(numeric));
  return Array.from(ids);
}

/** Skip phone/user ids — backend WS is keyed on chatroom UUID or small numeric room id. */
export function isValidWsChatRoomId(roomId: string): boolean {
  const s = roomId.trim();
  if (!s) return false;
  if (/^[0-9a-f-]{36}$/i.test(s)) return true;
  if (s.includes("-") && !/^\d+$/.test(s)) return true;
  if (/^\d+$/.test(s)) {
    // Nigerian phones / swipe user ids (8099448550) are not chat room ids.
    if (s.length >= 10) return false;
    return Number(s) > 0;
  }
  // Backend chatroom_id is often a 32-char profile hash.
  if (/^[0-9a-f]{32}$/i.test(s)) return true;
  return false;
}

export function wsChatRoomIdsForMatch(card: ProfileCard): string[] {
  const chatroom = card.chatroom_id?.trim();
  if (chatroom && isValidWsChatRoomId(chatroom)) return [chatroom];
  const numeric = resolveNumericRoomId(card);
  if (numeric != null && isValidWsChatRoomId(String(numeric))) {
    return [String(numeric)];
  }
  return [];
}

/** All valid WS room ids for call signaling listeners (hash + numeric aliases). */
export function wsCallRoomIdsForMatch(card: ProfileCard): string[] {
  return callRoomIdsForMatch(card).filter((id) => isValidWsChatRoomId(id));
}

// ─── Chat history (API + local fallback) ─────────────────────────────────────

export interface StoredChatMessage {
  id: number;
  from: "me" | "them";
  text: string;
  time: string;
  at: number;
  isRead?: boolean;
  delivery?: "sending" | "sent" | "delivered" | "read" | "failed";
}

const CHAT_MSG_PREFIX = "lm_chat_msgs_";
const CHAT_ROOM_PREFIX = "lm_chat_room_";

function chatMsgKey(roomId: string | number): string {
  return `${CHAT_MSG_PREFIX}${chatOwnerScopeKey()}_${roomId}`;
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
  const byText = new Map<string, StoredChatMessage>();

  const textKey = (msg: StoredChatMessage) =>
    `${msg.text}\u0000${Math.floor(msg.at / 5000)}`;

  for (const list of lists) {
    for (const msg of list) {
      const prev = map.get(msg.id);
      if (
        prev?.from === "me" &&
        msg.from === "them" &&
        prev.text === msg.text &&
        Math.abs(prev.at - msg.at) < 60_000 &&
        (prev.delivery === "sent" || prev.delivery === "sending")
      ) {
        map.set(msg.id, {
          ...msg,
          from: "me",
          delivery: prev.delivery ?? msg.delivery,
        });
        byText.set(textKey(msg), map.get(msg.id)!);
        continue;
      }
      map.set(msg.id, msg);
      const tk = textKey(msg);
      const prevText = byText.get(tk);
      if (
        prevText?.from === "me" &&
        msg.from === "them" &&
        prevText.text === msg.text &&
        (prevText.delivery === "sent" || prevText.delivery === "sending")
      ) {
        map.delete(msg.id);
        map.set(prevText.id, {
          ...msg,
          id: prevText.id,
          from: "me",
          delivery: prevText.delivery ?? msg.delivery,
        });
        byText.set(tk, map.get(prevText.id)!);
      } else {
        byText.set(tk, msg);
      }
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
  about_me?: string;
  location?: string;
  interests?: string;
  sexual_orientation?: string;
  religion?: string | null;
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

type ProfileExtras = {
  about_me?: string;
  location?: string;
  interests?: string;
  sexual_orientation?: string;
  religion?: string | null;
};

function readProfileExtrasMap(): Record<string, ProfileExtras> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_EXTRAS_BY_PHONE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ProfileExtras>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist editable text fields keyed by phone so they survive logout. */
export function storeProfileExtrasForPhone(
  phone: string | null | undefined,
  extras: ProfileExtras
): void {
  if (typeof window === "undefined") return;
  const key = normalizePhone(phone ?? "");
  if (key.length < 10) return;
  try {
    const map = readProfileExtrasMap();
    const prev = map[key] ?? {};
    map[key] = {
      about_me: extras.about_me?.trim() || prev.about_me,
      location: extras.location?.trim() || prev.location,
      interests: extras.interests?.trim() || prev.interests,
      sexual_orientation: extras.sexual_orientation?.trim() || prev.sexual_orientation,
      religion:
        extras.religion !== undefined ? extras.religion : prev.religion ?? null,
    };
    window.localStorage.setItem(PROFILE_EXTRAS_BY_PHONE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

export function getProfileExtrasForPhone(
  phone: string | null | undefined
): ProfileExtras | null {
  const key = normalizePhone(phone ?? "");
  if (key.length < 10) return null;
  const entry = readProfileExtrasMap()[key];
  if (!entry || typeof entry !== "object") return null;
  return entry;
}

export function storeLoginProfileCache(cache: LoginProfileCache): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOGIN_PROFILE_CACHE_KEY, JSON.stringify(cache));
    const phone = getUser()?.phone;
    if (phone) {
      storeProfileExtrasForPhone(phone, {
        about_me: cache.about_me,
        location: cache.location,
        interests: cache.interests,
        sexual_orientation: cache.sexual_orientation,
        religion: cache.religion,
      });
    }
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
      about_me: parsed.about_me,
      location: parsed.location,
      interests: parsed.interests,
      sexual_orientation: parsed.sexual_orientation,
      religion: parsed.religion ?? null,
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

/**
 * Build an own-profile view from the login response cache + session.
 * Needed because PUT /single/user/profile rejects the JWT internal user_id
 * (e.g. 653 → "User does not exist") while login already returns photos.
 */
export function buildOwnProfileFromLoginCache(
  cache: LoginProfileCache | null = getLoginProfileCache(),
  user: SessionUser | null = getUser()
): SingleProfile | null {
  if (!cache && !user) return null;

  const name = (cache?.full_name || user?.fullName || "").trim();
  const gender = (cache?.gender || "").trim();
  const profile_image = normalizeMediaInput(cache?.profile_image ?? null);
  const image1 = normalizeMediaInput(cache?.image1 ?? null);
  const image2 = normalizeMediaInput(cache?.image2 ?? null);

  if (!name && !gender && !profile_image && !image1 && !image2) return null;

  let age = 0;
  const dob = user?.dateOfBirth?.trim();
  if (dob) {
    const parsed = Date.parse(dob);
    if (!Number.isNaN(parsed)) {
      const years = Math.floor((Date.now() - parsed) / (365.25 * 24 * 60 * 60 * 1000));
      if (years > 0 && years < 120) age = years;
    }
  }

  return {
    name,
    date_of_birth: age,
    about_me: (
      cache?.about_me ||
      getLocalProfileDraft()?.about_me ||
      getProfileExtrasForPhone(user?.phone)?.about_me ||
      ""
    ).trim(),
    profile_image,
    image1,
    image2,
    location: (
      cache?.location ||
      getLocalProfileDraft()?.location ||
      getProfileExtrasForPhone(user?.phone)?.location ||
      ""
    ).trim(),
    religion:
      cache?.religion ??
      getLocalProfileDraft()?.religion ??
      getProfileExtrasForPhone(user?.phone)?.religion ??
      null,
    gender,
    sexual_orientation: (
      cache?.sexual_orientation ||
      getLocalProfileDraft()?.sexual_orientation ||
      getProfileExtrasForPhone(user?.phone)?.sexual_orientation ||
      ""
    ).trim(),
    interests: (
      cache?.interests ||
      getLocalProfileDraft()?.interests ||
      getProfileExtrasForPhone(user?.phone)?.interests ||
      ""
    ).trim(),
  };
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
  // Only persist real profile lookup ids — short JWT user_ids (e.g. 509) fail
  // on PUT /single/user/profile and must not wipe a good stored hash.
  const profileLookupId = hash ?? extras?.hashedUserId ?? null;
  const sessionPhone = normalizePhone(loginData.phone ?? phone);

  setSession(loginData.token, {
    userId: loginData.user_id,
    fullName: loginData.full_name ?? extras?.fullName,
    phone: loginData.phone ?? phone,
    dateOfBirth: loginData.date_of_birth ?? extras?.dateOfBirth,
    profileCompleted: loginData.profile_completed,
    hashedUserId: profileLookupId ?? undefined,
  });
  if (profileLookupId && !/^\d{1,6}$/.test(profileLookupId)) {
    storeHashedUserId(profileLookupId);
  } else if (typeof window !== "undefined") {
    // Drop any stale phone-number / short-id "hash" left from older app versions.
    try {
      const stale = window.localStorage.getItem(HASHED_USER_ID_KEY);
      if (
        stale &&
        ( /^\d{1,6}$/.test(stale) ||
          (sessionPhone &&
            (stale === sessionPhone ||
              stale.endsWith(sessionPhone) ||
              sessionPhone.endsWith(stale))))
      ) {
        window.localStorage.removeItem(HASHED_USER_ID_KEY);
      }
    } catch {
      // ignore
    }
  }

  // Login does not return about_me — merge prior device extras so Account can show it.
  const priorCache = getLoginProfileCache();
  const phoneExtras = getProfileExtrasForPhone(sessionPhone);
  const fromLogin = loginProfileCacheFromResponse(loginData);
  void ensureSwipedTargetsHydrated({ fresh: true });

  if (fromLogin || priorCache || phoneExtras) {
    storeLoginProfileCache({
      profile_image: fromLogin?.profile_image ?? priorCache?.profile_image ?? null,
      image1: fromLogin?.image1 ?? priorCache?.image1 ?? null,
      image2: fromLogin?.image2 ?? priorCache?.image2 ?? null,
      gender: fromLogin?.gender || priorCache?.gender,
      full_name: fromLogin?.full_name || priorCache?.full_name,
      about_me:
        phoneExtras?.about_me?.trim() ||
        priorCache?.about_me?.trim() ||
        undefined,
      location:
        phoneExtras?.location?.trim() ||
        priorCache?.location?.trim() ||
        undefined,
      interests:
        phoneExtras?.interests?.trim() ||
        priorCache?.interests?.trim() ||
        undefined,
      sexual_orientation:
        phoneExtras?.sexual_orientation?.trim() ||
        priorCache?.sexual_orientation?.trim() ||
        undefined,
      religion:
        phoneExtras?.religion !== undefined
          ? phoneExtras.religion
          : priorCache?.religion ?? null,
    });
  }

  try {
    window.localStorage.removeItem("lm_chat_inbox");
    window.dispatchEvent(new Event("lm-inbox-change"));
  } catch {
    // ignore
  }
}

export interface ProfileCard {
  id: number;
  /** Hashed / opaque id for GET /single/user/profile. */
  user_id: string;
  /** Numeric id for POST /swipe (feed `user_id` or `swipe_user_id`). */
  swipe_user_id?: string;
  name: string;
  location: string;
  age: number;
  profile_photo: string | null;
  chatroom_id?: string;
  /** Numeric room id for REST + WebSocket (same value per backend /chat/test/). */
  room_id?: number;
  /** Match row id for POST /unmatched when present. */
  match_id?: string;
}

/** Build display name from varying LetsMeet list/feed payload shapes. */
export function resolveCardDisplayName(raw: Record<string, unknown>): string {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const v = raw[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const direct = pick("name", "full_name", "names");
  if (direct) return direct;

  const first = pick("first_name");
  const last = pick("last_name");
  const combined = [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return combined || "User";
}

/** Swipe target from feed — long numeric legacy id or opaque hash `user_id`. */
function resolveSwipeUserId(raw: Record<string, unknown>): string {
  for (const key of ["swipe_user_id", "swipe_id", "target_user_id"]) {
    const value = raw[key];
    if (value == null) continue;
    if (typeof value === "string") {
      const text = value.trim();
      if (/^\d{8,}$/.test(text)) return text;
      continue;
    }
    if (typeof value === "number" && Number.isSafeInteger(value)) {
      const text = String(value);
      if (/^\d{8,}$/.test(text)) return text;
    }
  }

  const uid = raw.user_id;
  if (typeof uid === "string") {
    const text = uid.trim();
    if (!text) return "";
    if (/^\d{8,}$/.test(text)) return text;
    // Opaque hash `user_id` from feed / like-list responses.
    if (isOpaqueUserId(text) && !/^\d+$/.test(text)) return text;
  }
  if (typeof uid === "number" && Number.isSafeInteger(uid)) {
    const text = String(uid);
    if (/^\d{8,}$/.test(text)) return text;
  }

  return "";
}

/** Opaque profile id for GET /single/user/profile (not always numeric). */
function resolveProfileUserId(
  raw: Record<string, unknown>,
  swipeUserId: string
): string {
  for (const key of ["user_hash", "hashed_user_id", "profile_id", "uuid"]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const uid = raw.user_id;
  if (typeof uid === "string" && uid.trim()) {
    const text = uid.trim();
    if (!/^\d+$/.test(text)) return text;
    if (text !== swipeUserId) return text;
  }

  return swipeUserId || (uid != null ? String(uid).trim() : "");
}

/** Map varying backend field names onto ProfileCard. */
export function normalizeProfileCard(raw: Record<string, unknown>): ProfileCard {
  const photo =
    (typeof raw.profile_photo === "string" && raw.profile_photo) ||
    (typeof raw.profile_image === "string" && raw.profile_image) ||
    (typeof raw.image === "string" && raw.image) ||
    null;

  const idRaw = raw.id ?? raw.match_id;
  const swipeUserId = resolveSwipeUserId(raw);
  const profileUserId = resolveProfileUserId(raw, swipeUserId);
  const matchRaw = raw.match_id ?? raw.id;

  const chatroomRaw = raw.chatroom_id;
  let chatroomId =
    typeof chatroomRaw === "string"
      ? chatroomRaw.trim()
      : typeof chatroomRaw === "number"
        ? String(chatroomRaw)
        : undefined;

  const listRowId = typeof idRaw === "number" ? idRaw : Number(idRaw) || 0;
  let roomId = parseNumericRoomId(raw.room_id as string | number | null | undefined);
  if (roomId != null && listRowId > 0 && roomId === listRowId) roomId = null;
  if (roomId == null && chatroomId) {
    const fromChatroom = parseNumericRoomId(chatroomId);
    if (fromChatroom != null && (listRowId <= 0 || fromChatroom !== listRowId)) {
      roomId = fromChatroom;
    }
  }

  const card: ProfileCard = {
    id: typeof idRaw === "number" ? idRaw : Number(idRaw) || 0,
    user_id: profileUserId,
    swipe_user_id: swipeUserId || undefined,
    name: resolveCardDisplayName(raw),
    location: String(raw.location ?? ""),
    age: typeof raw.age === "number" ? raw.age : Number(raw.age) || 0,
    profile_photo: photo,
    chatroom_id: chatroomId,
    room_id: roomId ?? undefined,
    match_id: matchRaw != null && String(matchRaw).trim() ? String(matchRaw) : undefined,
  };
  return card;
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
  const urls = fields.photoUrls ?? [null, null, null];
  const persistLocalText = () => {
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
      about_me: fields.about_me,
      location: fields.location,
      interests: fields.interests,
      sexual_orientation: fields.sexual_orientation,
      religion: fields.religion ?? null,
    });
    storeProfileExtrasForPhone(getUser()?.phone, {
      about_me: fields.about_me,
      location: fields.location,
      interests: fields.interests,
      sexual_orientation: fields.sexual_orientation,
      religion: fields.religion ?? null,
    });
  };

  const full = await uploadProfile(fields);
  if (full.ok || full.status === 500) {
    persistLocalText();
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
    // Completed profiles reject text updates — always keep About Me on-device.
    persistLocalText();
    if (fields.fullName?.trim()) {
      updateUser({ fullName: fields.fullName.trim() });
    }
    return { ok: true, localOnly: !photos.ok };
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
  await ensureSwipedTargetsHydrated();

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
        notice: "No one matched your age filter — showing everyone available instead.",
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

export function parseApiChatMessages(
  data: unknown,
  opts?: { peerUserId?: string | null; localHint?: StoredChatMessage[] }
): StoredChatMessage[] {
  const peerId = opts?.peerUserId?.trim() || null;
  const localHint = opts?.localHint ?? [];
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as { messages?: unknown; items?: unknown }).messages ??
        (data as { items?: unknown }).items ??
        [])
      : [];

  if (!Array.isArray(list)) return [];

  // Learn our numeric sender id only from server message ids we sent (never by text match).
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as ApiChatMessage;
    const msgId = m.id ?? m.message_id;
    const senderId = m.sender_id ?? m.user_id;
    if (msgId == null || senderId == null) continue;
    const idNum = Number(msgId);
    if (!Number.isFinite(idNum)) continue;
    const local = localHint.find(
      (h) =>
        h.from === "me" &&
        h.id === idNum &&
        (h.delivery === "sent" || h.delivery === "sending")
    );
    if (local) rememberOwnSenderId(senderId);
  }

  const parsed = list
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;
      const m = raw as ApiChatMessage;
      const text = m.message ?? m.text ?? "";
      if (!text.trim()) return null;

      const senderId = m.sender_id ?? m.user_id;
      const from = resolveMessageFrom(senderId, peerId, {
        is_mine: m.is_mine,
        is_sender: m.is_sender,
      });

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
        delivery: from === "me" ? "sent" : undefined,
      };
      if (typeof m.is_read === "boolean") {
        message.isRead = m.is_read;
      }
      return message;
    })
    .filter((m): m is StoredChatMessage => m != null)
    .sort((a, b) => a.at - b.at);

  return parsed;
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export async function resolveMessageRoomId(
  roomId: string | number
): Promise<string | null> {
  const match = await findMatchByRoomId(roomId);

  const chatroom = match?.chatroom_id?.trim();
  if (chatroom) {
    return chatroom;
  }

  const peer = readChatPeer();
  if (peerMatchesRoom(peer, roomId) && peer?.chatroomId?.trim()) {
    return peer.chatroomId.trim();
  }

  const numeric = match ? resolveNumericRoomId(match) : null;
  if (numeric != null) {
    return String(numeric);
  }

  const fromStash = resolveApiRoomId(roomId);
  if (fromStash != null && (!match || fromStash !== match.id)) {
    return String(fromStash);
  }

  const raw = String(roomId).trim();
  if (!raw) return null;
  if (match && raw === String(match.id)) return null;
  if (/^[0-9a-f-]{36}$/i.test(raw)) return raw;
  if (/^[0-9a-f]{32}$/i.test(raw)) return raw;
  if (raw.includes("-") && !/^\d+$/.test(raw)) return raw;

  return null;
}

export function getMessageList(roomId: number | string, page = 1) {
  return resolveMessageRoomId(roomId).then((apiRoomId) => {
    if (!apiRoomId) {
      return {
        ok: false,
        status: 400,
        data: { error: "Chat room not ready." },
      } as ApiResult<unknown>;
    }
    return request<unknown>(
      `/message/room/${encodeURIComponent(apiRoomId)}?page=${page}`,
      { auth: true }
    );
  });
}

const MESSAGE_PAGE_SIZE = 20;

function extractRawMessageList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as { messages?: unknown; items?: unknown };
    const list = obj.messages ?? obj.items;
    return Array.isArray(list) ? list : [];
  }
  return [];
}

/** Fetch all message pages — API defaults to ~20 per page. */
export async function fetchMessageHistory(
  roomId: number | string,
  opts?: { peerUserId?: string | null; localHint?: StoredChatMessage[] }
): Promise<ApiResult<StoredChatMessage[]>> {
  const allRaw: unknown[] = [];
  let page = 1;
  let lastStatus = 200;
  let hadError = false;

  while (page <= 50) {
    const res = await getMessageList(roomId, page);
    if (!res.ok) {
      if (page === 1) {
        return res as ApiResult<StoredChatMessage[]>;
      }
      hadError = true;
      break;
    }
    lastStatus = res.status;
    const batch = extractRawMessageList(res.data);
    if (batch.length === 0) break;
    allRaw.push(...batch);
    if (batch.length < MESSAGE_PAGE_SIZE) break;
    page += 1;
  }

  const parsed = parseApiChatMessages(allRaw, opts);

  if (hadError && parsed.length === 0) {
    return { ok: false, status: lastStatus, data: [] };
  }
  return { ok: true, status: lastStatus, data: parsed };
}

/** Mark one notification read — `GET /notification/read?notification_id=` */
export function markNotificationRead(id: number) {
  const params = new URLSearchParams({ notification_id: String(id) });
  return request(`/notification/read?${params}`, { auth: true });
}

/** Delete one notification — `GET /notification/delete?notification_id=` */
export function deleteNotification(id: number | string) {
  const params = new URLSearchParams({ notification_id: String(id) });
  return request(`/notification/delete?${params}`, { auth: true });
}

/** Unmatch — `POST /unmatched` with `{ match_id }`. */
export function unmatchUser(match_id: string) {
  return request("/unmatched", {
    method: "POST",
    body: { match_id },
    auth: true,
  });
}

/** Resolve match_id for unmatch from a matched profile card. */
export function matchIdForUnmatch(card: ProfileCard): string | null {
  const id = (card.match_id ?? (card.id ? String(card.id) : "")).trim();
  return id || null;
}

/**
 * Best-effort ICE / call bootstrap — `GET /video_audio`.
 * Upstream schema is empty; parse whatever usable iceServers/token we get.
 */
export type VideoAudioConfig = {
  iceServers?: RTCIceServer[];
  token?: string;
  raw?: unknown;
};

function asIceServers(value: unknown): RTCIceServer[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const servers: RTCIceServer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const urls = row.urls ?? row.url;
    if (typeof urls === "string" || Array.isArray(urls)) {
      const server: RTCIceServer = { urls: urls as string | string[] };
      if (typeof row.username === "string") server.username = row.username;
      if (typeof row.credential === "string") server.credential = row.credential;
      servers.push(server);
    }
  }
  return servers.length ? servers : undefined;
}

export function parseVideoAudioConfig(data: unknown): VideoAudioConfig {
  if (!data || typeof data !== "object") return { raw: data };
  const obj = data as Record<string, unknown>;
  const nested =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : obj;
  const iceServers =
    asIceServers(nested.iceServers) ??
    asIceServers(nested.ice_servers) ??
    asIceServers(nested.servers);
  const token =
    typeof nested.token === "string"
      ? nested.token
      : typeof nested.access_token === "string"
        ? nested.access_token
        : undefined;
  return { iceServers, token, raw: data };
}

let videoAudioCache: VideoAudioConfig | null = null;
let videoAudioInflight: Promise<VideoAudioConfig> | null = null;

export async function getVideoAudio(force = false): Promise<VideoAudioConfig> {
  if (!force && videoAudioCache) return videoAudioCache;
  if (!force && videoAudioInflight) return videoAudioInflight;

  videoAudioInflight = (async () => {
    try {
      const res = await request<unknown>("/video_audio", { auth: true });
      const config = res.ok ? parseVideoAudioConfig(res.data) : {};
      videoAudioCache = config;
      return config;
    } catch {
      return videoAudioCache ?? {};
    } finally {
      videoAudioInflight = null;
    }
  })();

  return videoAudioInflight;
}

/**
 * Match compatibility AI — `POST /ai` with `{ username, content }`.
 * Backend uses this for comparison analysis between the signed-in user and a match.
 */
export function analyzeMatchCompatibility(body: {
  username: string;
  content: string;
}) {
  return request<unknown>("/ai", {
    method: "POST",
    body: {
      username: body.username.trim(),
      content: body.content.trim(),
    },
    auth: true,
  });
}

/** Build onboarding bio prompt for POST /ai. */
export function buildAboutMeAiContent(input: {
  interests?: string[];
  orientation?: string[];
  notes?: string;
}): string {
  const parts = [
    input.notes?.trim() || "",
    input.interests?.length ? `Interests: ${input.interests.join(", ")}` : "",
    input.orientation?.length ? `Attraction: ${input.orientation.join(", ")}` : "",
    "Write a warm, genuine dating bio for me in first person.",
  ].filter(Boolean);
  return parts.join(". ");
}

/**
 * Onboarding bio helper — `POST /ai` with `{ username, content }`.
 * (Same endpoint as match comparison; content drives the response shape.)
 */
export function generateAboutMeAi(body: { username: string; content: string }) {
  return request<unknown>("/ai", {
    method: "POST",
    body: {
      username: body.username.trim(),
      content: body.content.trim(),
    },
    auth: true,
  });
}

/** Build the comparison payload content from two profiles. */
export function buildMatchComparisonContent(input: {
  me: {
    name?: string;
    gender?: string;
    about_me?: string;
    location?: string;
    religion?: string | null;
    interests?: string;
    sexual_orientation?: string;
    age?: number | string | null;
  };
  them: {
    name?: string;
    gender?: string;
    about_me?: string;
    location?: string;
    religion?: string | null;
    interests?: string;
    sexual_orientation?: string;
    age?: number | string | null;
  };
}): string {
  const fmt = (p: typeof input.me, label: string) => {
    const lines = [
      `${label}: ${p.name || "Unknown"}`,
      p.age != null && String(p.age).trim() ? `Age: ${p.age}` : "",
      p.gender ? `Gender: ${p.gender}` : "",
      p.sexual_orientation ? `Orientation: ${p.sexual_orientation}` : "",
      p.religion ? `Religion: ${p.religion}` : "",
      p.location ? `Location: ${p.location}` : "",
      p.interests ? `Interests: ${p.interests}` : "",
      p.about_me ? `About: ${p.about_me}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  };

  return [
    "Provide a match compatibility comparison analysis between these two people.",
    "Cover shared interests, lifestyle fit, possible friction, and a clear compatibility summary.",
    "",
    fmt(input.me, "Me"),
    "",
    fmt(input.them, "Them"),
  ].join("\n");
}

/** Pull analysis text from opaque AI response shapes. */
export function normalizeAiAnalysis(data: unknown): string {
  if (typeof data === "string") return data.trim();
  if (!data || typeof data !== "object") return "";
  const obj = data as Record<string, unknown>;
  for (const key of [
    "analysis",
    "comparison",
    "compatibility",
    "content",
    "message",
    "text",
    "result",
    "about_me",
    "generated",
  ]) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (obj.data != null) return normalizeAiAnalysis(obj.data);
  if (obj.response != null) return normalizeAiAnalysis(obj.response);
  return "";
}

/** @deprecated Use normalizeAiAnalysis */
export function normalizeAiAboutMe(data: unknown): string {
  return normalizeAiAnalysis(data);
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
    name: resolveCardDisplayName(raw),
    date_of_birth: dateOfBirth,
    about_me: String(
      raw.about_me ?? raw.about ?? raw.bio ?? raw.description ?? ""
    ).trim(),
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
    const rest = { ...user };
    delete rest.hashedUserId;
    setSession(getToken() ?? "", rest);
  }
}

/** Fetch the signed-in user's profile via PUT /single/user/profile. */
export async function fetchMyProfile(): Promise<{
  ok: boolean;
  profile: SingleProfile | null;
  error?: string;
}> {
  const user = getUser();
  if (!user) return { ok: false, profile: null, error: "Not signed in." };

  const sessionPhone = normalizePhone(user.phone ?? "");

  const candidates: string[] = [];
  const push = (id?: string | number | null, opts?: { allowNumeric?: boolean }) => {
    if (id == null) return;
    const v = String(id).trim();
    if (!v || candidates.includes(v)) return;

    // Never use the account phone as a profile lookup id.
    if (sessionPhone && (v === sessionPhone || v.endsWith(sessionPhone) || sessionPhone.endsWith(v))) {
      return;
    }

    // Untrusted long numerics (legacy phone-tail bug) — only allow when
    // the id comes from JWT / session userId (opts.allowNumeric).
    if (/^\d{7,}$/.test(v) && !opts?.allowNumeric) return;

    candidates.push(v);
  };

  push(getStoredHashedUserId(), { allowNumeric: true });
  push(user.hashedUserId, { allowNumeric: true });

  // Feed / public profile ids are long numerics (10+ digits). The JWT
  // `user_id` is an internal DB id (e.g. 653) and returns
  // {"message":"User does not exist"} on /single/user/profile — skip short ids.
  if (user.userId > 0 && String(user.userId).length >= 7) {
    push(user.userId, { allowNumeric: true });
  }

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
          if (typeof v === "string") push(v, { allowNumeric: true });
        }
        const jwtUserId = payload.user_id ?? payload.sub;
        if (typeof jwtUserId === "number" || typeof jwtUserId === "string") {
          if (String(jwtUserId).trim().length >= 7) {
            push(jwtUserId, { allowNumeric: true });
          }
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
    // Persist whatever id successfully resolved *our* profile for next time.
    storeHashedUserId(id);
    return { ok: true, profile };
  }

  // Last resort only when we have no session name to verify against.
  if (!sessionName) {
    for (const id of candidates) {
      const profile = await tryLoadSingleProfile(id, { persistHash: false });
      if (profile) {
        storeHashedUserId(id);
        return { ok: true, profile };
      }
    }
  }

  // Login already returns name/gender/photos. Use that when the public
  // profile id is unknown (common: JWT user_id ≠ swipe/profile user_id).
  const fromLogin = buildOwnProfileFromLoginCache();
  if (fromLogin && (fromLogin.profile_image || fromLogin.image1 || fromLogin.gender || fromLogin.name)) {
    return { ok: true, profile: fromLogin };
  }

  return {
    ok: false,
    profile: null,
    error:
      "Could not load your full profile from the server. Sign out and sign back in to refresh your photos, or upload them below.",
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
  const targetId = userId.trim();
  if (!targetId || !isApiUserId(targetId)) {
    return Promise.resolve({
      ok: false,
      status: 400,
      data: { message: "Missing swipe target user_id." } as SwipeResponse,
    });
  }
  return request<SwipeResponse>("/swipe", {
    method: "POST",
    body: { user_id: targetId, swipe_type: type },
    auth: true,
  });
}

/**
 * `user_id` for POST /swipe.
 * Legacy feeds: long numeric on `user_id`. Current feed: 32-char hash on `user_id`.
 */
export function swipeTargetId(card: ProfileCard): string {
  return pickApiUserId(card.swipe_user_id, card.user_id);
}

/** `user_id` for POST /like (liked-you list). Prefer hash, then long numeric. */
export function likeTargetId(
  card: Pick<ProfileCard, "user_id" | "swipe_user_id">
): string {
  return pickApiUserId(card.user_id, card.swipe_user_id);
}

/** @deprecated Use likeTargetId — list row `id` is not the API user id. */
export function profileNumericId(
  card: Pick<ProfileCard, "id" | "user_id" | "swipe_user_id">
): string {
  return likeTargetId(card);
}

/** Discover feed — swipe right (like) or left (pass). */
export function swipeProfile(card: ProfileCard, type: "like" | "pass") {
  const targetId = swipeTargetId(card);
  return swipe(targetId, type);
}

/** “Liked you” — they already liked you; you like back to match. */
export function likeBack(card: ProfileCard) {
  return likeUser(likeTargetId(card));
}

// ─── Swiped discover profiles (local + server hydration) ─────────────────────

const SWIPED_KEY = "lm_swiped_targets";
const SWIPED_HYDRATE_TTL_MS = 30_000;

let swipedHydrateAt = 0;
let swipedHydrateInflight: Promise<void> | null = null;

function swipedStorageKey(): string {
  const phone = normalizePhone(getUser()?.phone ?? "");
  if (phone.length >= 12) return `lm_swiped_phone_${phone}`;
  const uid = getUser()?.userId;
  return uid ? `lm_swiped_v2_${uid}` : SWIPED_KEY;
}

function readSwipedTargetList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = swipedStorageKey();
    const keys = [key];
    const uid = getUser()?.userId;
    if (uid) keys.push(`lm_swiped_v2_${uid}`);
    keys.push(SWIPED_KEY);

    for (const storageKey of keys) {
      const raw = localStorage.getItem(storageKey);
      if (!raw) continue;
      const list = JSON.parse(raw) as string[];
      if (!Array.isArray(list)) continue;
      if (storageKey !== key) {
        localStorage.setItem(key, JSON.stringify(list));
        if (storageKey === SWIPED_KEY) localStorage.removeItem(SWIPED_KEY);
      }
      return list.filter((id) => typeof id === "string" && id.trim());
    }
    return [];
  } catch {
    return [];
  }
}

export function getSwipedTargetIds(): Set<string> {
  return new Set(readSwipedTargetList());
}

/** All swipe/profile ids for a card — feed may use hash or numeric interchangeably. */
export function collectCardTargetIds(
  card: Pick<ProfileCard, "user_id" | "swipe_user_id">
): string[] {
  const ids = new Set<string>();
  const push = (value?: string | null) => {
    const text = value?.trim();
    if (text && isApiUserId(text)) ids.add(text);
  };
  push(card.swipe_user_id);
  push(card.user_id);
  return Array.from(ids);
}

export function mergeSwipedTargets(targetIds: string[]): void {
  if (typeof window === "undefined" || targetIds.length === 0) return;
  const set = getSwipedTargetIds();
  let changed = false;
  for (const id of targetIds) {
    const text = id.trim();
    if (!text || set.has(text)) continue;
    set.add(text);
    changed = true;
  }
  if (changed) {
    localStorage.setItem(swipedStorageKey(), JSON.stringify(Array.from(set)));
    invalidateSwipedHydrateCache();
  }
}

export function markSwipedTarget(targetId: string): void {
  mergeSwipedTargets([targetId]);
}

export function markSwipedCard(card: ProfileCard): void {
  mergeSwipedTargets(collectCardTargetIds(card));
}

export function filterSwipedCards(cards: ProfileCard[]): ProfileCard[] {
  const seen = getSwipedTargetIds();
  return cards.filter((card) => {
    const ids = collectCardTargetIds(card);
    return ids.length === 0 || !ids.some((id) => seen.has(id));
  });
}

export function invalidateSwipedHydrateCache(): void {
  swipedHydrateAt = 0;
  swipedHydrateInflight = null;
}

/** True when the server already recorded this swipe (safe to hide locally). */
export function isBenignSwipeReplayResponse(res: {
  ok: boolean;
  data?: SwipeResponse | null;
}): boolean {
  if (res.ok) return true;
  const msg = extractError(res.data, "").toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("processed") ||
    msg.includes("swiped") ||
    msg.includes("duplicate")
  );
}

async function hydrateSwipedTargetsFromServer(): Promise<void> {
  const ids = new Set<string>();

  try {
    const matches = await fetchMatchedListCached();
    for (const card of matches) {
      for (const id of collectCardTargetIds(card)) ids.add(id);
    }
  } catch {
    // ignore — local swipe cache still applies
  }

  if (ids.size > 0) mergeSwipedTargets(Array.from(ids));
}

/** Merge server-side swipe/match history into the local hide list (cross-device). */
export async function ensureSwipedTargetsHydrated(opts?: {
  fresh?: boolean;
}): Promise<void> {
  if (typeof window === "undefined" || !isLoggedIn()) return;
  if (opts?.fresh) invalidateSwipedHydrateCache();

  const now = Date.now();
  if (!opts?.fresh && now - swipedHydrateAt < SWIPED_HYDRATE_TTL_MS) return;
  if (swipedHydrateInflight) return swipedHydrateInflight;

  swipedHydrateInflight = hydrateSwipedTargetsFromServer()
    .then(() => {
      swipedHydrateAt = Date.now();
    })
    .finally(() => {
      swipedHydrateInflight = null;
    });

  return swipedHydrateInflight;
}

export function likeUser(userId: string) {
  const targetId = userId.trim();
  if (!targetId || !isApiUserId(targetId)) {
    return Promise.resolve({
      ok: false,
      status: 400,
      data: { matched: false, message: "Missing like target user_id." } as LikeResponse,
    });
  }
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

const MATCHED_LIST_TTL_MS = 20_000;
let matchedListCacheAt = 0;
let matchedListInflight: Promise<ProfileCard[]> | null = null;
let matchedListCached: ProfileCard[] = [];

export function invalidateMatchedListCache(): void {
  matchedListCacheAt = 0;
  matchedListCached = [];
  matchedListInflight = null;
}

/** Deduped matched/list — avoids 30+ parallel calls from chat listener + pages. */
export async function fetchMatchedListCached(opts?: {
  fresh?: boolean;
}): Promise<ProfileCard[]> {
  if (opts?.fresh) invalidateMatchedListCache();

  const now = Date.now();
  if (matchedListCached.length > 0 && now - matchedListCacheAt < MATCHED_LIST_TTL_MS) {
    return matchedListCached;
  }
  if (matchedListInflight) return matchedListInflight;

  matchedListInflight = getMatchedList()
    .then((res) => {
      const list = res.ok ? parseProfileCards(res.data) : [];
      matchedListCached = list;
      matchedListCacheAt = Date.now();
      matchedListInflight = null;
      return list;
    })
    .catch((err) => {
      matchedListInflight = null;
      throw err;
    });

  return matchedListInflight;
}

export async function sendMessage(
  message: string,
  roomId: string | number
) {
  const match = await findMatchByRoomId(roomId);
  const apiRoomId = await resolveMessageRoomId(roomId);

  if (!apiRoomId) {
    return {
      ok: false,
      status: 400,
      data: { error: "Chat room not ready. Go back and reopen the conversation." },
    } as ApiResult<SendMessageResponse>;
  }

  const res = await request<SendMessageResponse>("/message/send", {
    method: "POST",
    body: {
      message,
      room_id: apiRoomId,
      reply_to: null,
    },
    auth: true,
  });
  if (res.ok && res.data?.sender_id != null) {
    rememberOwnSenderId(res.data.sender_id);
  }
  return res;
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
