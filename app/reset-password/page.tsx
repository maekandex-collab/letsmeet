"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { InputField } from "@/components/FormFields";
import { updatePassword, extractError } from "@/lib/letsmeet";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (phoneParam) {
      setPhone(phoneParam);
    }
  }, [phoneParam]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 3000);
  };

  const handleResetPassword = async () => {
    setError("");
    if (!phone) {
      setError("Phone number is required.");
      return;
    }
    if (otp.length < 6) {
      setError("OTP must be 6 digits.");
      return;
    }
    if (pin.length < 6) {
      setError("PIN must be 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await updatePassword(phone, pin, confirmPin);
      const data = res.data;
      if (res.ok) {
        showToast(extractError(data, "Password updated successfully! Redirecting to Sign In..."), "success");
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      } else {
        const errMsg = extractError(data, "Failed to update password. Please try again.");
        setError(errMsg);
        showToast(errMsg, "error");
      }
    } catch {
      const errMsg = "Network error. Failed to update password.";
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const isValid = phone.length >= 10 && otp.length === 6 && pin.length === 6 && confirmPin.length === 6;

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
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3-3.5 3.5z" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="screen-title mb-2">Reset PIN</h1>
        <p className="screen-subtitle mb-8">
          Enter the verification code and set your new 6-digit PIN.
        </p>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <InputField
            label="Phone Number"
            id="phone"
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            placeholder="e.g. 2348136819208"
            disabled={!!phoneParam}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.63a16 16 0 0 0 6 6l.95-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />

          <InputField
            label="Verification Code (OTP)"
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="6-digit OTP code"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="#616568" strokeWidth="2" />
                <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />

          <InputField
            label="New PIN"
            id="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="New 6-digit PIN"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#616568" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />

          <InputField
            label="Confirm New PIN"
            id="confirmPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => {
              setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="Confirm new 6-digit PIN"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#616568" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
        </form>

        {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
      </div>

      <div className="bottom-bar">
        <button
          onClick={handleResetPassword}
          disabled={!isValid || loading}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting..." : "Reset PIN"}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell h-screen flex items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
