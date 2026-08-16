"use client";

import { useVisualViewport } from "@/lib/useVisualViewport";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  error?: string;
  onFocus?: () => void;
}

export default function ChatComposer({
  value,
  onChange,
  onSend,
  sending = false,
  error,
  onFocus,
}: ChatComposerProps) {
  const { keyboardOffset } = useVisualViewport();
  const canSend = value.trim().length > 0 && !sending;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-mobile z-50 bg-white/90 backdrop-blur-xl border-t border-primary/10 shadow-[0_-8px_28px_rgba(42,20,54,0.08)]"
      style={{
        bottom: keyboardOffset,
        transition: keyboardOffset > 0 ? "bottom 0.1s ease-out" : undefined,
      }}
    >
      {error && <p className="px-4 pt-2 text-xs text-red-500">{error}</p>}
      <div
        className="px-3 py-3 flex items-center gap-2"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          onFocus={onFocus}
          placeholder="Type a message..."
          inputMode="text"
          enterKeyHint="send"
          className="flex-1 h-12 px-4 rounded-[24px] bg-[#f4eef6] border border-primary/10 text-[15px] text-dark placeholder-muted focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/25 transition-all"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-[#d946ef] shadow-[0_6px_16px_rgba(247,89,245,0.3)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:shadow-none flex-shrink-0"
          aria-label="Send message"
        >
          {sending ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
