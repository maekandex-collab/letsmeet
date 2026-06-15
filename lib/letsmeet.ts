// LetsMeet API client. All calls go through the Next.js proxy at /api/letsmeet/*
// (see app/api/letsmeet/[...path]/route.ts) which forwards to the real backend.

const PROXY = "/api/letsmeet";

const MEDIA_BASE =
  process.env.NEXT_PUBLIC_LETSMEET_BASE_URL ?? "https://mtn.lenhub.net";

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

/** Turns a backend media path (e.g. /media/profile_pics/x.jpg) into a full URL. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${MEDIA_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
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
  user_id: string; // hashed id (used by single-profile + swipe targets via /like)
  name: string;
  location: string;
  age: number;
  profile_photo: string | null;
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
