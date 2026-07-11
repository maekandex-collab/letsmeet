"use client";

import { useRef, useState } from "react";
import ProfilePhoto from "@/components/ProfilePhoto";

export type ProfilePhotoSlot = {
  url: string | null;
  preview: string | null;
  pendingBlob: Blob | null;
  removed: boolean;
};

export function emptyPhotoSlot(): ProfilePhotoSlot {
  return { url: null, preview: null, pendingBlob: null, removed: false };
}

export function photoSlotsFromUrls(
  urls: [string | null, string | null, string | null]
): ProfilePhotoSlot[] {
  return urls.map((url) => ({
    url,
    preview: null,
    pendingBlob: null,
    removed: false,
  }));
}

function slotDisplaySrc(slot: ProfilePhotoSlot): string | null {
  if (slot.removed) return null;
  return slot.preview ?? slot.url;
}

interface ProfilePhotoEditorProps {
  slots: ProfilePhotoSlot[];
  onChange: (slots: ProfilePhotoSlot[]) => void;
  labels?: [string, string, string];
}

export default function ProfilePhotoEditor({
  slots,
  onChange,
  labels = ["Main photo", "Photo 2", "Photo 3"],
}: ProfilePhotoEditorProps) {
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

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
    });
  }

  const viewSrc = viewIndex != null ? slotDisplaySrc(slots[viewIndex]) : null;

  return (
    <>
      <div className="pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-dark">Your photos</h2>
            <p className="text-xs text-muted mt-0.5">Tap to view · use + to add or replace</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {slots.map((slot, index) => {
            const src = slotDisplaySrc(slot);
            const isMain = index === 0;

            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-primary-light border border-border/70">
                  {src ? (
                    <button
                      type="button"
                      className="absolute inset-0 w-full h-full"
                      onClick={() => setViewIndex(index)}
                      aria-label={`View ${labels[index]}`}
                    >
                      {slot.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={slot.preview} alt={labels[index]} className="w-full h-full object-cover" />
                      ) : (
                        <ProfilePhoto photo={slot.url} alt={labels[index]} priority={isMain} />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlot(index);
                        fileRefs[index].current?.click();
                      }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted hover:bg-primary/5 transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5v14M5 12h14" stroke="#F759F5" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="text-[11px] font-semibold">Add</span>
                    </button>
                  )}

                  {src && (
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlot(index);
                          fileRefs[index].current?.click();
                        }}
                        className="w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
                        aria-label={`Replace ${labels[index]}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlot(index)}
                        className="w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
                        aria-label={`Remove ${labels[index]}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {isMain && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wide bg-primary text-white px-2 py-0.5 rounded-full">
                      Main
                    </span>
                  )}

                  <input
                    ref={fileRefs[index]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFileChange(index, e)}
                  />
                </div>
                <p className="text-[10px] text-muted text-center truncate">{labels[index]}</p>
              </div>
            );
          })}
        </div>

        {activeSlot != null && (
          <p className="text-[11px] text-muted mt-2 text-center">
            {activeSlot === 0
              ? "Main photo is required and shown on Discover."
              : "Optional extra photos for your profile."}
          </p>
        )}
      </div>

      {viewIndex != null && viewSrc && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-[60]"
            onClick={() => setViewIndex(null)}
          />
          <div className="fixed inset-0 z-[61] flex flex-col items-center justify-center p-5 pointer-events-none">
            <div className="relative w-full max-w-[360px] pointer-events-auto">
              <button
                type="button"
                onClick={() => setViewIndex(null)}
                className="absolute -top-12 right-0 text-white text-sm font-semibold px-3 py-1.5 rounded-full bg-white/15"
              >
                Close
              </button>
              <div className="rounded-3xl overflow-hidden bg-black shadow-2xl">
                {slots[viewIndex].preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slots[viewIndex].preview!} alt={labels[viewIndex]} className="w-full max-h-[70dvh] object-contain" />
                ) : (
                  <ProfilePhoto photo={slots[viewIndex].url} alt={labels[viewIndex]} priority />
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    fileRefs[viewIndex].current?.click();
                    setViewIndex(null);
                  }}
                  className="btn-primary flex-1 text-sm py-2.5"
                >
                  Replace photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeSlot(viewIndex);
                    setViewIndex(null);
                  }}
                  className="btn-secondary flex-1 text-sm py-2.5 text-red-600 border-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
