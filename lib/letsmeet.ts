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

export interface SessionUser {
  userId: number;
  fullName?: string;
  phone?: string;
  profileCompleted: boolean;
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

/** Strip junk values; always returns a clean `/media/...` path or null. */
export function normalizeMediaInput(path?: string | null): string | null {
  const value = path?.trim();
  if (!value) return null;

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

const LETSMEET_MEDIA_ORIGIN = "http://letsmeet.com.ng";

/** Upstream URLs to try for a normalized `/media/...` path. */
export function mediaUpstreamUrls(cleanPath: string): string[] {
  const path = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return Array.from(new Set([`${MEDIA_BASE}${path}`, `${LETSMEET_MEDIA_ORIGIN}${path}`]));
}

/** Turns a backend media path (e.g. /media/profile_pics/x.jpg) into a full URL. */
export function mediaUrl(path?: string | null): string | null {
  const cleanPath = normalizeMediaInput(path);
  if (!cleanPath) return null;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return `${MEDIA_PROXY}?url=${encodeURIComponent(cleanPath)}`;
  }

  if (cleanPath.startsWith("//")) {
    return `${MEDIA_PROXY}?url=${encodeURIComponent(`http:${cleanPath}`)}`;
  }

  return `${MEDIA_PROXY}?url=${encodeURIComponent(`${MEDIA_BASE}${cleanPath}`)}`;
}

/** Warm the browser cache for upcoming profile photos (call after feed/matches load). */
const clientMediaBlobs = new Map<string, string>();
const CLIENT_BLOB_MAX = 64;

function mediaCacheKey(path?: string | null): string | null {
  return normalizeMediaInput(path);
}

export function getClientMediaUrl(path?: string | null): string | null {
  if (typeof window === "undefined") return mediaUrl(path);
  const key = mediaCacheKey(path);
  if (key && clientMediaBlobs.has(key)) return clientMediaBlobs.get(key)!;
  return mediaUrl(path);
}

export async function warmMediaBlob(path?: string | null): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const key = mediaCacheKey(path);
  const proxyUrl = mediaUrl(path);
  if (!key || !proxyUrl) return null;

  const existing = clientMediaBlobs.get(key);
  if (existing) return existing;

  const inflight = warmInflight.get(key);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const res = await fetch(proxyUrl, { cache: "force-cache" });
      if (!res.ok) return null;
      const blob = await res.blob();
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

export function buildChatHref(params: {
  room: string | number;
  name: string;
  id: string;
  photo?: string | null;
  chatroomId?: string | null;
}): string {
  const q = new URLSearchParams();
  q.set("id", params.id);
  q.set("room", String(params.room));
  q.set("name", params.name);
  const path = normalizeMediaInput(params.photo);
  if (path && path.startsWith("/") && path.length < 180) {
    q.set("photo", path);
  }
  if (params.chatroomId) {
    q.set("chatroom", params.chatroomId);
  }
  return `/chat?${q.toString()}`;
}

// ─── Local chat history (backend has send only, no message list API) ─────────

export interface StoredChatMessage {
  id: number;
  from: "me" | "them";
  text: string;
  time: string;
  at: number;
}

const CHAT_MSG_PREFIX = "lm_chat_msgs_";
const CHAT_ROOM_PREFIX = "lm_chat_room_";

function chatMsgKey(roomId: string | number): string {
  return `${CHAT_MSG_PREFIX}${roomId}`;
}

export function loadChatMessages(roomId: string | number): StoredChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(chatMsgKey(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatMessages(
  roomId: string | number,
  messages: StoredChatMessage[]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(chatMsgKey(roomId), JSON.stringify(messages.slice(-200)));
  } catch {
    // quota exceeded — best effort
  }
}

/** Map chatroom UUID → integer room_id returned by POST /message/send */
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

export function extractError(
  data: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.message === "string") return obj.message;
  const first = Object.values(obj)[0];
  if (Array.isArray(first) && typeof first[0] === "string") return first[0];
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
  const headers: Record<string, string> = {};

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
      data = { message: text };
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
}

export interface ProfileCard {
  id: number;
  user_id: string; // hashed id — for GET /single/user/profile only
  name: string;
  location: string;
  age: number;
  profile_photo: string | null;
  chatroom_id?: string;
}

export interface SingleProfile {
  name: string;
  date_of_birth: number; // backend returns age here
  about_me: string;
  profile_image: string | null;
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
  chatroom_id?: string;
}

export interface LikeResponse {
  matched: boolean;
  match_id?: number;
  chatroom_id?: string;
}

export interface SendMessageResponse {
  message_id?: number;
  room_id?: number;
  sender_id?: number;
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

export function uploadProfile(fields: ProfileUploadFields) {
  const form = new FormData();
  form.append("sexual_orientation", fields.sexual_orientation);
  form.append("gender", fields.gender);
  form.append("interests", fields.interests);
  form.append("about_me", fields.about_me);
  form.append("location", fields.location);
  form.append("show_location", String(fields.show_location));
  form.append("profile_image", fields.profile_image, "profile.jpg");
  if (fields.image1) form.append("image1", fields.image1, "image1.jpg");
  if (fields.image2) form.append("image2", fields.image2, "image2.jpg");
  return request("/user/profile", { method: "POST", form, auth: true });
}

export function getFeed() {
  return request<ProfileCard[]>("/feed", { auth: true });
}

export function getSingleProfile(userId: string) {
  return request<{ profile: SingleProfile }>(
    `/single/user/profile?user_id=${encodeURIComponent(userId)}`,
    { auth: true }
  );
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

export function sendMessage(
  message: string,
  roomId: number,
  replyTo?: number | null
) {
  return request<SendMessageResponse>("/message/send", {
    method: "POST",
    body: { message, room_id: roomId, reply_to: replyTo ?? null },
    auth: true,
  });
}

/** Backend path uses the typo `notifcation` (not notification). */
export function getNotificationList(page = 1, pageSize?: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize != null) params.set("page_size", String(pageSize));
  return request<PagedNotifications>(`/notifcation/list?${params}`, { auth: true });
}
