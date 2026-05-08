"use client";
import Link from "next/link";
import { useRef } from "react";
import { BackHeader } from "@/components/Header";

export default function CreatePinPage() {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const handleInput = (i: number, e: React.FormEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value;
    if (val && i < 3) inputs.current[i + 1]?.focus();
    if (!val && i > 0) inputs.current[i - 1]?.focus();
  };

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="screen-title mb-2">Create New PIN</h1>
        <p className="screen-subtitle mb-8">
          Add a PIN to keep your account extra secure.
        </p>

        <div className="flex gap-4 justify-center mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="password"
              maxLength={1}
              onInput={(e) => handleInput(i, e)}
              className="w-14 h-16 rounded-2xl border-2 border-border bg-border text-center text-2xl font-bold text-dark outline-none focus:border-primary transition-colors"
            />
          ))}
        </div>

        <p className="text-sm text-center text-muted">Re-enter PIN to confirm</p>
        <div className="flex gap-4 justify-center mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <input
              key={i}
              type="password"
              maxLength={1}
              className="w-14 h-16 rounded-2xl border-2 border-border bg-border text-center text-2xl font-bold text-dark outline-none focus:border-primary transition-colors"
            />
          ))}
        </div>
      </div>

      <div className="bottom-bar">
        <Link href="/fingerprint" className="btn-primary">
          Create PIN
        </Link>
      </div>
    </div>
  );
}
