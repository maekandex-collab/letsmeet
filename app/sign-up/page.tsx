"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { InputField } from "@/components/FormFields";
import LetsMeetLogo from "@/components/LetsMeetLogo";
import {
  createUser,
  loginUser,
  extractError,
  interpretLoginResponse,
  persistLoginSession,
  normalizePhone,
  resetDiscoverLocalState,
  hasValidSession,
} from "@/lib/letsmeet";
import { clearDraft, saveDraft } from "@/lib/profileDraft";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromQuery =
    searchParams.get("num") ?? searchParams.get("phone") ?? "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneLocked, setPhoneLocked] = useState(false);
  const [dob, setDob] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasValidSession()) {
      router.replace("/home");
    }
  }, [router]);

  useEffect(() => {
    const digits = phoneFromQuery.replace(/\D/g, "");
    if (digits.length < 10) return;
    setPhone(normalizePhone(digits));
    setPhoneLocked(true);
  }, [phoneFromQuery]);

  const pinLockIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="#616568" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  async function handleSubmit() {
    setError("");
    if (!name.trim()) return setError("Please enter your full name.");
    if (phone.replace(/\D/g, "").length < 10)
      return setError("Please enter a valid phone number.");
    if (!dob) return setError("Please select your date of birth.");
    if (pin.length !== 6) return setError("PIN must be exactly 6 digits.");
    if (pin !== confirmPin)
      return setError("PINs do not match. Please try again.");
    if (!agreed)
      return setError("Please accept the Privacy Policy & Terms of Service.");

    const number = normalizePhone(phone);
    setLoading(true);
    try {
      const created = await createUser({
        phone_number: number,
        full_name: name.trim(),
        date_of_birth: dob,
        pin,
        confirm_pin: confirmPin,
      });
      if (!created.ok) {
        setError(extractError(created.data, "Could not create your account."));
        return;
      }

      const login = await loginUser(number, pin);
      const result = interpretLoginResponse(login);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      clearDraft();
      resetDiscoverLocalState();
      persistLoginSession(result.data, number, {
        fullName: name.trim(),
        dateOfBirth: dob,
      });
      saveDraft({});
      router.push("/setup");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isValid =
    name.trim() !== "" &&
    phone.replace(/\D/g, "").length >= 10 &&
    dob !== "" &&
    pin.length === 6 &&
    confirmPin.length === 6 &&
    agreed;

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <LetsMeetLogo size={52} className="mb-5" />
        <h1 className="screen-title">Create Account</h1>
        <p className="screen-subtitle mb-8">
          {phoneLocked
            ? "Your number is locked from your registration link. Add your details and set a 6-digit PIN."
            : "Join LetsMeet and find your perfect match today"}
        </p>

        <InputField
          label="Full Name"
          id="name"
          type="text"
          name="name"
          placeholder="Your Full Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#616568" strokeWidth="2" />
              <path
                d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20"
                stroke="#616568"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          }
        />

        <div className="input-group">
          <label htmlFor="phone" className="input-label">
            Phone Number
            {phoneLocked ? (
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Locked from link
              </span>
            ) : null}
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.63a16 16 0 0 0 6 6l.95-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                  stroke="#616568"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="e.g. 08012345678"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                if (!phoneLocked) setPhone(e.target.value);
              }}
              readOnly={phoneLocked}
              className={`input-field ${phoneLocked ? "opacity-90 cursor-not-allowed" : ""}`}
            />
          </div>
          {phoneLocked ? (
            <p className="text-xs text-muted mt-1.5">
              This number came from your USSD / SMS link and cannot be changed.
            </p>
          ) : null}
        </div>

        <div className="input-group">
          <label htmlFor="dob" className="input-label">
            Date of Birth
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="#616568"
                  strokeWidth="2"
                />
                <path
                  d="M16 2v4M8 2v4M3 10h18"
                  stroke="#616568"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              id="dob"
              type="date"
              name="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="pin" className="input-label">
            Create a 6-digit PIN
          </label>
          <div className="input-wrapper">
            <span className="input-icon">{pinLockIcon}</span>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit PIN"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-muted mt-1.5">
            Must be exactly 6 numbers. Used to secure your account.
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="confirm-pin" className="input-label">
            Confirm PIN
          </label>
          <div className="input-wrapper">
            <span className="input-icon">{pinLockIcon}</span>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              placeholder="Re-enter 6-digit PIN"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 mt-5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-primary flex-shrink-0"
          />
          <span className="text-sm text-muted leading-5">
            I agree to the{" "}
            <Link
              href="/settings/privacy"
              className="text-dark font-semibold underline"
            >
              Privacy Policy
            </Link>{" "}
            &amp;{" "}
            <Link
              href="/settings/privacy"
              className="text-dark font-semibold underline"
            >
              Terms of Service
            </Link>
          </span>
        </label>

        {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

        <p className="text-sm text-center text-muted mt-5">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary font-bold">
            Sign In
          </Link>
        </p>
      </div>

      <div className="bottom-bar">
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
