"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Header";
import {
  changePassword,
  extractError,
  getUser,
  isLoggedIn,
  loginUser,
  normalizePhone,
} from "@/lib/letsmeet";

type Step = "current" | "new" | "confirm";

const STEP_CONFIG: Record<Step, { title: string; subtitle: string; label: string }> = {
  current: {
    title: "Enter Current PIN",
    subtitle: "Enter your existing 6-digit PIN to continue",
    label: "Current PIN",
  },
  new: {
    title: "Create New PIN",
    subtitle: "Choose a new 6-digit PIN for your account",
    label: "New PIN",
  },
  confirm: {
    title: "Confirm New PIN",
    subtitle: "Re-enter your new PIN to confirm",
    label: "Confirm PIN",
  },
};

const STEPS: Step[] = ["current", "new", "confirm"];

function PinDots({ value }: { value: string }) {
  return (
    <div className="flex gap-4 justify-center my-8">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full transition-all duration-150 ${
            i < value.length ? "bg-primary scale-110" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

export default function ChangePinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("current");
  const [pins, setPins] = useState<Record<Step, string>>({ current: "", new: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const advancingRef = useRef(false);

  const config = STEP_CONFIG[step];
  const currentPin = pins[step];

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/sign-in");
    }
  }, [router]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  function handleInput(val: string) {
    if (loading || success) return;
    const numeric = val.replace(/\D/g, "").slice(0, 6);
    setError("");
    setPins((p) => ({ ...p, [step]: numeric }));

    if (numeric.length === 6 && !advancingRef.current) {
      advancingRef.current = true;
      setTimeout(() => {
        void advance(numeric).finally(() => {
          advancingRef.current = false;
        });
      }, 120);
    }
  }

  async function advance(pin: string) {
    if (step === "current") {
      setLoading(true);
      setError("");
      try {
        const phone = normalizePhone(getUser()?.phone ?? "");
        if (!phone || phone.length < 12) {
          setError("Could not verify your account. Please sign in again.");
          setPins((p) => ({ ...p, current: "" }));
          return;
        }
        const res = await loginUser(phone, pin);
        if (!res.ok) {
          setError(extractError(res.data, "Current PIN is incorrect."));
          setPins((p) => ({ ...p, current: "" }));
          return;
        }
        setStep("new");
      } catch {
        setError("Network error. Please try again.");
        setPins((p) => ({ ...p, current: "" }));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === "new") {
      if (pin === pins.current) {
        setError("New PIN must be different from your current PIN.");
        setPins((p) => ({ ...p, new: "" }));
        return;
      }
      setStep("confirm");
      return;
    }

    // Confirm step
    if (pin !== pins.new) {
      setError("PINs don't match. Please try again.");
      setPins((p) => ({ ...p, confirm: "" }));
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await changePassword(pins.current, pins.new);
      if (!res.ok) {
        setError(extractError(res.data, "Could not change PIN. Please try again."));
        setPins((p) => ({ ...p, confirm: "" }));
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/settings/security"), 1600);
    } catch {
      setError("Network error. Please try again.");
      setPins((p) => ({ ...p, confirm: "" }));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (loading) return;
    const idx = STEPS.indexOf(step);
    if (idx === 0) {
      router.back();
    } else {
      setStep(STEPS[idx - 1]);
      setError("");
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-white">
      <BackHeader title="Change PIN" onBack={goBack} backHref="/settings/security" />

      <div className="flex-1 flex flex-col px-6 pt-20">
        <div className="flex gap-2 mt-6 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= stepIndex ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-dark mb-2">PIN Changed!</h2>
            <p className="text-sm text-muted">Your PIN has been updated successfully.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-dark">{config.title}</h2>
              <p className="text-sm text-muted mt-2">{config.subtitle}</p>
              {loading && (
                <p className="text-sm text-primary font-medium mt-3">
                  {step === "current" ? "Verifying PIN…" : "Updating PIN…"}
                </p>
              )}
            </div>

            <PinDots value={currentPin} />

            {error && (
              <p className="text-center text-sm text-red-500 font-medium mb-4 -mt-4">{error}</p>
            )}

            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={currentPin}
              onChange={(e) => handleInput(e.target.value)}
              className="opacity-0 absolute pointer-events-none"
              autoFocus
              disabled={loading}
            />

            <div className="mt-auto pb-10">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleInput(currentPin + n)}
                    disabled={loading || currentPin.length >= 6}
                    className="h-16 rounded-2xl bg-[#F5F5F5] text-xl font-bold text-dark active:bg-primary active:text-white transition-colors disabled:opacity-40"
                  >
                    {n}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  onClick={() => handleInput(currentPin + "0")}
                  disabled={loading || currentPin.length >= 6}
                  className="h-16 rounded-2xl bg-[#F5F5F5] text-xl font-bold text-dark active:bg-primary active:text-white transition-colors disabled:opacity-40"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setError("");
                    setPins((p) => ({ ...p, [step]: p[step].slice(0, -1) }));
                  }}
                  className="h-16 rounded-2xl bg-[#F5F5F5] flex items-center justify-center active:bg-border transition-colors disabled:opacity-40"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" stroke="#12151C" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M18 9l-6 6M12 9l6 6" stroke="#12151C" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
