import Link from "next/link";
import { BackHeader } from "@/components/Header";
import { InputField } from "@/components/FormFields";

export default function SignInPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <h1 className="screen-title">Welcome Back!</h1>
        <p className="screen-subtitle mb-8">Your LetsMeet dating adventure awaits</p>

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

        <div className="input-group">
          <label htmlFor="pin" className="input-label">PIN</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#616568" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="6-digit PIN"
              className="input-field"
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="flex justify-end mb-6 -mt-2">
          <Link href="/forgot-password" className="text-sm font-semibold text-primary">
            Forgot PIN?
          </Link>
        </div>

        <p className="text-sm text-center text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-primary font-bold">Sign Up</Link>
        </p>
      </div>

      <div className="bottom-bar">
        <Link href="/home" className="btn-primary">
          Sign In
        </Link>
      </div>
    </div>
  );
}
