"use client";

import { useEffect, useRef } from "react";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  error?: string;
  onFocus?: () => void;
  /** When the keyboard is open, drop home-indicator padding so the bar sits flush. */
  keyboardOpen?: boolean;
  keyboardInset?: number;
  onOpenGames?: () => void;
}

export default function ChatComposer({
  value,
  onChange,
  onSend,
  sending = false,
  error,
  onFocus,
  keyboardOpen = false,
  keyboardInset = 0,
  onOpenGames,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSend = value.trim().length > 0 && !sending;

  function bringInputIntoView() {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    window.setTimeout(() => {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, 320);
  }

  useEffect(() => {
    if (keyboardOpen) bringInputIntoView();
  }, [keyboardOpen]);

  return (
    <div className="relative z-20 w-full flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-primary/10 shadow-[0_-8px_28px_rgba(42,20,54,0.08)]">
      {error && <p className="px-4 pt-2 text-xs text-red-500">{error}</p>}
      <div
        className="px-3 pt-2.5 flex items-center gap-2"
        style={{
          paddingBottom: keyboardOpen
            ? "max(0.625rem, env(safe-area-inset-bottom, 0px))"
            : "calc(0.625rem + env(safe-area-inset-bottom, 0px))",
          marginBottom: keyboardOpen && keyboardInset > 0 ? 0 : undefined,
        }}
      >
        {onOpenGames && (
          <button
            type="button"
            onClick={onOpenGames}
            className="w-11 h-11 rounded-full bg-primary-light/80 border border-primary/15 flex items-center justify-center flex-shrink-0 pressable"
            aria-label="Challenge to a game"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 12h4M8 10v4" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
              <circle cx="15.5" cy="10.5" r="1" fill="#F759F5" />
              <circle cx="17.5" cy="13.5" r="1" fill="#3E36ED" />
              <rect x="2" y="7" width="20" height="10" rx="5" stroke="#F759F5" strokeWidth="2" />
            </svg>
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          onFocus={() => {
            onFocus?.();
            bringInputIntoView();
          }}
          placeholder="Type a message..."
          inputMode="text"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          className="flex-1 min-w-0 h-11 px-4 rounded-[22px] bg-[#f4eef6] border border-primary/10 text-[16px] text-dark placeholder-muted focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/25 transition-all"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-[#d946ef] shadow-[0_6px_16px_rgba(247,89,245,0.3)] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:shadow-none flex-shrink-0"
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
