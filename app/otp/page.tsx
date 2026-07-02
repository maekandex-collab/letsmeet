"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { forgetPassword, extractError } from "@/lib/letsmeet";

function OtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";

  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    // Focus first input on mount
    inputs.current[0]?.focus();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 3000);
  };

  const handleInput = (index: number, e: React.FormEvent<HTMLInputElement>) => {
    const rawVal = (e.target as HTMLInputElement).value;
    // Keep only the last digit entered
    const val = rawVal.replace(/\D/g, "").slice(-1);

    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        // Clear previous input and focus it
        const newCode = [...code];
        newCode[index - 1] = "";
        setCode(newCode);
        inputs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pastedData[i] || "";
    }
    setCode(newCode);

    // Focus last filled or next input
    const focusIndex = Math.min(pastedData.length, 5);
    inputs.current[focusIndex]?.focus();
  };

  const handleResend = async () => {
    if (!phone || resending) return;
    try {
      setResending(true);
      const res = await forgetPassword(phone);
      const data = res.data;
      if (res.ok) {
        showToast(extractError(data, "Verification code resent successfully!"), "success");
      } else {
        showToast(extractError(data, "Failed to resend code."), "error");
      }
    } catch {
      showToast("Network error. Failed to resend code.", "error");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = () => {
    const codeString = code.join("");
    if (codeString.length < 6) {
      showToast("Please enter the complete 6-digit code.", "error");
      return;
    }

    setLoading(true);
    // Redirect to reset password page with phone and code query parameters
    setTimeout(() => {
      router.push(`/reset-password?phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(codeString)}`);
      setLoading(false);
    }, 800);
  };

  const maskPhoneNumber = (num: string) => {
    if (!num) return "";
    const clean = num.trim();
    if (clean.length < 9) return clean;
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} *** ${clean.slice(-3)}`;
  };

  const isComplete = code.every((digit) => digit !== "");

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />

      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-card border border-border animate-slide-in max-w-[90%] w-[350px]">
          <style>{`
            @keyframes slideIn {
              from { transform: translate(-50%, -20px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
            .animate-slide-in {
              animation: slideIn 0.3s ease forwards;
            }
          `}</style>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${toast.type === "success" ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"}`}>
            {toast.type === "success" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-dark">{toast.type === "success" ? "Success" : "Error"}</p>
            <p className="text-xs text-muted leading-snug">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="#F759F5" strokeWidth="2" />
            <circle cx="12" cy="16" r="2" fill="#F759F5" />
            <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="screen-title mb-2">Enter Verification Code</h1>
        <p className="screen-subtitle mb-8">
          We sent a 6-digit verification code to <span className="font-semibold text-dark">{maskPhoneNumber(phone)}</span>.
        </p>

        <div className="flex gap-2.5 justify-center mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={code[i]}
              onInput={(e) => handleInput(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-11 h-14 rounded-2xl border-2 border-border bg-border text-center text-xl font-bold text-dark outline-none focus:border-primary focus:bg-white transition-all"
            />
          ))}
        </div>

        <p className="text-sm text-center text-muted">
          Didn&apos;t receive the code?{" "}
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-primary font-bold hover:underline disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend"}
          </button>
        </p>
      </div>

      <div className="bottom-bar">
        <button
          onClick={handleVerify}
          disabled={!isComplete || loading}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell h-screen flex items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <OtpContent />
    </Suspense>
  );
}
