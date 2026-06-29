// Collects profile data across the multi-page onboarding flow
// (setup -> religion -> profile-setup) before a single multipart upload.

const KEY = "lm_profile_draft";

export interface ProfileDraft {
  sexual_orientation?: string;
  show_me?: string;
  interests?: string[];
  about_me?: string;
  photos?: string[]; // data URLs (base64)
  gender?: string;
  religion?: string;
  location?: string;
  /** Always true during onboarding — location sharing stays on. */
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
  try {
    const next = { ...getDraft(), ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("Failed to save draft to localStorage:", e);
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Resize and compress base64 images client-side before storing or uploading. */
export function compressImage(
  dataUrl: string,
  maxW = 600,
  maxH = 600
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(dataUrl);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
      } else {
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", 0.7);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
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
