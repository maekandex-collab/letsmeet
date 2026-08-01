"use client";

import { useRef, useState } from "react";
import ProfilePhoto from "@/components/ProfilePhoto";
import { isDefaultProfilePlaceholder } from "@/lib/letsmeet";

export type ProfilePhotoSlot = {
  url: string | null;
  preview: string | null;
  pendingBlob: Blob | null;
  removed: boolean;
};

export function emptyPhotoSlot(): ProfilePhotoSlot {
  return { url: null, preview: null, pendingBlob: null, removed: false };
}

/** Treat backend default logos as empty so they never render as real photos. */
function realPhotoUrl(url: string | null): string | null {
  if (!url || isDefaultProfilePlaceholder(url)) return null;
  return url;
}

export function photoSlotsFromUrls(
  urls: [string | null, string | null, string | null]
): ProfilePhotoSlot[] {
  return urls.map((url) => ({
    url: realPhotoUrl(url),
    preview: null,
    pendingBlob: null,
    removed: false,
  }));
}

function slotHasPhoto(slot: ProfilePhotoSlot): boolean {
  if (slot.removed) return false;
  if (slot.preview || slot.pendingBlob) return true;
  return Boolean(realPhotoUrl(slot.url));
}

function slotDisplaySrc(slot: ProfilePhotoSlot): string | null {
  if (slot.removed) return null;
  if (slot.preview) return slot.preview;
  return realPhotoUrl(slot.url);
}

interface ProfilePhotoEditorProps {
  slots: ProfilePhotoSlot[];
  onChange: (slots: ProfilePhotoSlot[]) => void;
}

export default function ProfilePhotoEditor({ slots, onChange }: ProfilePhotoEditorProps) {
  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  function updateSlot(index: number, patch: Partial<ProfilePhotoSlot>) {
    const next = [...slots];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function onFileChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      updateSlot(index, {
        preview: ev.target?.result as string,
        pendingBlob: file,
        removed: false,
      });
    };
    reader.readAsDataURL(file);
  }

  function removeSlot(index: number) {
    updateSlot(index, {
      preview: null,
      pendingBlob: null,
      removed: true,
      url: null,
    });
  }

  const filled = slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slotHasPhoto(slot));

  const nextEmptyIndex = slots.findIndex((slot) => !slotHasPhoto(slot));
  const canAdd = nextEmptyIndex !== -1;
  const main = filled[0] ?? null;
  const extras = filled.slice(1);
  const viewSrc = viewIndex != null ? slotDisplaySrc(slots[viewIndex]) : null;

  return (
    <>
      <div>
        {/* Hero main photo — only when one exists */}
        {main ? (
          <div className="relative w-full max-w-[220px] mx-auto aspect-square rounded-[1.5rem] overflow-hidden bg-[#1a1520] shadow-card">
            <button
              type="button"
              className="absolute inset-0 w-full h-full"
              onClick={() => setViewIndex(main.index)}
              aria-label="View main photo"
            >
              {main.slot.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={main.slot.preview}
                  alt="Main photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ProfilePhoto photo={main.slot.url} alt="Main photo" priority fit="cover" />
              )}
            </button>

            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
              <span className="text-white text-xs font-semibold drop-shadow-sm">
                Profile photo
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRefs[main.index].current?.click()}
                  className="h-8 px-2.5 rounded-full bg-white/95 text-dark text-[11px] font-bold flex items-center gap-1 shadow-card hover:bg-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Change
                </button>
                {main.index !== 0 || extras.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => removeSlot(main.index)}
                    className="w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-sm"
                    aria-label="Remove photo"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 6L6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>

            <input
              ref={fileRefs[main.index]}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileChange(main.index, e)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRefs[0].current?.click()}
            className="w-full max-w-[220px] mx-auto aspect-square rounded-[1.5rem] border-2 border-dashed border-primary/35 bg-primary-light/40 flex flex-col items-center justify-center gap-2.5 hover:bg-primary-light/70 transition-colors"
          >
            <span className="w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                  stroke="#F759F5"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="4" stroke="#F759F5" strokeWidth="2" />
              </svg>
            </span>
            <div className="text-center px-3">
              <p className="text-sm font-bold text-dark">Add photo</p>
              <p className="text-[11px] text-muted mt-0.5">Shown on Discover</p>
            </div>
            <input
              ref={fileRefs[0]}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFileChange(0, e)}
            />
          </button>
        )}

        {/* Extra photos that actually exist + optional add */}
        {(extras.length > 0 || (canAdd && main)) && (
          <div className="mt-3 flex justify-center gap-2.5 overflow-x-auto pb-0.5">
            {extras.map(({ slot, index }) => (
              <div
                key={index}
                className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-[#1a1520]"
              >
                <button
                  type="button"
                  className="absolute inset-0"
                  onClick={() => setViewIndex(index)}
                  aria-label={`View photo ${index + 1}`}
                >
                  {slot.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ProfilePhoto photo={slot.url} alt={`Photo ${index + 1}`} fit="cover" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <input
                  ref={fileRefs[index]}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFileChange(index, e)}
                />
              </div>
            ))}

            {canAdd && main && (
              <button
                type="button"
                onClick={() => fileRefs[nextEmptyIndex].current?.click()}
                className="w-16 h-16 flex-shrink-0 rounded-2xl border-2 border-dashed border-border-dark bg-[#FAFAFA] flex flex-col items-center justify-center gap-0.5 text-muted hover:border-primary/40 hover:bg-primary-light/30 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="#F759F5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[9px] font-bold text-dark">Add</span>
                <input
                  ref={fileRefs[nextEmptyIndex]}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFileChange(nextEmptyIndex, e)}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {viewIndex != null && viewSrc && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-5"
          onClick={() => setViewIndex(null)}
        >
          <div
            className="relative w-full max-w-[360px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewIndex(null)}
              className="absolute -top-12 right-0 text-white text-sm font-semibold px-3 py-1.5 rounded-full bg-white/15"
            >
              Close
            </button>
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-black shadow-2xl">
              {slots[viewIndex].preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slots[viewIndex].preview!}
                  alt="Photo"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <ProfilePhoto photo={slots[viewIndex].url} alt="Photo" priority />
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  fileRefs[viewIndex].current?.click();
                  setTimeout(() => setViewIndex(null), 100);
                }}
                className="btn-primary flex-1 text-sm py-2.5"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  removeSlot(viewIndex);
                  setViewIndex(null);
                }}
                className="btn-secondary flex-1 text-sm py-2.5 text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
