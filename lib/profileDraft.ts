// Collects profile data across the multi-page onboarding flow
// (setup -> location -> profile-setup) before a single multipart upload.

const KEY = "lm_profile_draft";

export interface ProfileDraft {
  sexual_orientation?: string;
  show_me?: string;
  interests?: string[];
  about_me?: string;
  photos?: string[]; // data URLs (base64)
  gender?: string;
  location?: string;
  show_location?: boolean;
}

export function getDraft(): ProfileDraft {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ProfileDraft;
  } catch {
    return {};
  }
}

export function saveDraft(patch: ProfileDraft): void {
  if (typeof window === "undefined") return;
  const next = { ...getDraft(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Converts a base64 data URL into a Blob suitable for multipart upload. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [meta, base64] = dataUrl.split(",");
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}
