"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { InputField } from "@/components/FormFields";

export default function SignUpPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  const pinLockIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="#616568" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  function handleSubmit() {
    if (pin !== confirmPin) {
      setPinError("PINs do not match. Please try again.");
      return;
    }
    setPinError("");
    router.push("/setup");
  }

  const isValid = pin.length === 6 && confirmPin.length === 6;

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <h1 className="screen-title">Create Account</h1>
        <p className="screen-subtitle mb-8">Join LetsMeet and find your perfect match today</p>

        <InputField
          label="Full Name"
          id="name"
          type="text"
          name="name"
          placeholder="Your Full Name"
          autoComplete="name"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#616568" strokeWidth="2" />
              <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />

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

        {/* Date of Birth */}
        <div className="input-group">
          <label htmlFor="dob" className="input-label">Date of Birth</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#616568" strokeWidth="2" />
                <path d="M16 2v4M8 2v4M3 10h18" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="dob"
              type="date"
              name="dob"
              className="input-field"
            />
          </div>
        </div>

        {/* PIN field */}
        <div className="input-group">
          <label htmlFor="pin" className="input-label">Create a 6-digit PIN</label>
          <div className="input-wrapper">
            <span className="input-icon">{pinLockIcon}</span>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit PIN"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-muted mt-1.5">Must be exactly 6 numbers. Used to secure your account.</p>
        </div>

        {/* Confirm PIN field */}
        <div className="input-group">
          <label htmlFor="confirm-pin" className="input-label">Confirm PIN</label>
          <div className="input-wrapper">
            <span className="input-icon">{pinLockIcon}</span>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinError(""); }}
              placeholder="Re-enter 6-digit PIN"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          {pinError && <p className="text-xs text-red-500 mt-1.5">{pinError}</p>}
        </div>

        <label className="flex items-start gap-3 mt-5 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 mt-0.5 accent-primary flex-shrink-0" />
          <span className="text-sm text-muted leading-5">
            I agree to the{" "}
            <Link href="/settings/privacy" className="text-dark font-semibold underline">Privacy Policy</Link>
            {" "}&amp;{" "}
            <Link href="/settings/privacy" className="text-dark font-semibold underline">Terms of Service</Link>
          </span>
        </label>

        <p className="text-sm text-center text-muted mt-5">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary font-bold">Sign In</Link>
        </p>
      </div>

      <div className="bottom-bar">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
