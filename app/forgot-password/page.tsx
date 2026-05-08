import Link from "next/link";
import { BackHeader } from "@/components/Header";
import { InputField } from "@/components/FormFields";

export default function ForgotPasswordPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
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

        <form>
          <InputField
            label="Phone Number"
            id="phone"
            type="tel"
            name="phone"
            placeholder="e.g. +1 234 567 8900"
            autoComplete="tel"
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
        <Link href="/otp" className="btn-primary">
          Send Reset Code
        </Link>
      </div>
    </div>
  );
}
