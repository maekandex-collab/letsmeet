"use client"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { InputField } from "@/components/FormFields";
import { useState } from "react";
import { forgetPassword } from "@/lib/letsmeet";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  })

  const handleForgetPassword = async () => {
    try {
      setLoading(true)
      const response = await forgetPassword(phoneNumber)
      const data = response.data as any;
      if (response.ok) {
        const msg = data?.message || "Reset OTP code sent successfully!";
        setMessage(msg)
        setToast({ show: true, message: msg, type: "success" })
        setTimeout(() => {
          router.push(`/otp?phone=${encodeURIComponent(phoneNumber)}`)
        }, 1500)
      } else {
        const errMsg = data?.message || "Failed to request password reset.";
        setMessage(errMsg)
        setToast({ show: true, message: errMsg, type: "error" })
        setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
      }
      setLoading(false)
    } catch (error) {
      setMessage("An unexpected error occurred.")
      setToast({ show: true, message: "An unexpected error occurred.", type: "error" })
      setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
      setLoading(false)
    }
  }

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
            <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="screen-title mb-2">Forgot PIN?</h1>
        <p className="screen-subtitle mb-8">
          No worries! Enter your phone number and we&apos;ll send you a verification code.
        </p>

        <p className="text-green-500">{message}</p>

        <form>
          <InputField
            label="Phone Number"
            id="phone"
            type="tel"
            name="phone_number"
            placeholder="e.g. +1 234 567 8900"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.63a16 16 0 0 0 6 6l.95-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
        </form>

        <p className="text-sm text-center text-muted mt-4">
          Remembered it?{" "}
          <Link href="/sign-in" className="text-primary font-bold">
            Sign In
          </Link>
        </p>
      </div>

      <div className="bottom-bar">
        {/* <Link href="/otp" className="btn-primary">
          Send Reset Code
        </Link> */}
          <button
          onClick={handleForgetPassword}
          disabled={loading}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Please wait..." : "Send Reset code"}
        </button>
      </div>
    </div>
  );
}
