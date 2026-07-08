"use client";

import Avatar from "@/components/Avatar";

interface IncomingCallOverlayProps {
  name: string;
  photo: string | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallOverlay({
  name,
  photo,
  onAccept,
  onDecline,
}: IncomingCallOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#1a2030]/95 flex flex-col items-center justify-center px-8 text-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-primary/20 animate-ping" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-primary/30 animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <Avatar photo={photo} name={name} size="lg" className="!w-24 !h-24 text-lg" priority />
        <p className="text-white font-bold text-xl mt-6 mb-1">{name}</p>
        <p className="text-white/70 text-sm mb-10">Incoming video call…</p>

        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={onDecline}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-card hover:opacity-90 transition-opacity"
            title="Decline"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72 12.1 12.1 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.1 12.1 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"
                fill="white"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-card hover:opacity-90 transition-opacity"
            title="Accept"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <polygon points="23 7 16 12 23 17 23 7" fill="white" />
              <rect x="1" y="5" width="15" height="14" rx="2" fill="white" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
