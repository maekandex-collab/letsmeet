"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Header";

type Step = "current" | "new" | "confirm";

const STEP_CONFIG: Record<Step, { title: string; subtitle: string; label: string }> = {
  current: {
    title: "Enter Current PIN",
    subtitle: "Enter your existing 4-digit PIN to continue",
    label: "Current PIN",
  },
  new: {
    title: "Create New PIN",
    subtitle: "Choose a new 4-digit PIN for your account",
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
      {[0, 1, 2, 3].map((i) => (
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
  const inputRef = useRef<HTMLInputElement>(null);

  const config = STEP_CONFIG[step];
  const currentPin = pins[step];

  function handleInput(val: string) {
    const numeric = val.replace(/\D/g, "").slice(0, 4);
    setError("");
    setPins((p) => ({ ...p, [step]: numeric }));

    if (numeric.length === 4) {
      setTimeout(() => advance(numeric), 120);
    }
  }

  function advance(pin: string) {
    if (step === "current") {
      // In a real app you'd validate against stored PIN
      setStep("new");
    } else if (step === "new") {
      setStep("confirm");
    } else {
      // Confirm step — check match
      if (pin !== pins.new) {
        setError("PINs don't match. Please try again.");
        setPins((p) => ({ ...p, confirm: "" }));
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/settings/security"), 1600);
    }
  }

  function goBack() {
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
        {/* Progress bar */}
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
          /* ── Success state ── */
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
          /* ── Pin entry ── */
          <div className="flex-1 flex flex-col">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-dark">{config.title}</h2>
              <p className="text-sm text-muted mt-2">{config.subtitle}</p>
            </div>

            <PinDots value={currentPin} />

            {error && (
              <p className="text-center text-sm text-red-500 font-medium mb-4 -mt-4">{error}</p>
            )}

            {/* Hidden input to trigger keyboard */}
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={currentPin}
              onChange={(e) => handleInput(e.target.value)}
              className="opacity-0 absolute pointer-events-none"
              autoFocus
            />

            {/* Numpad */}
            <div className="mt-auto pb-10">
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleInput(currentPin + n)}
                    disabled={currentPin.length >= 4}
                    className="h-16 rounded-2xl bg-[#F5F5F5] text-xl font-bold text-dark active:bg-primary active:text-white transition-colors disabled:opacity-40"
                  >
                    {n}
                  </button>
                ))}
                {/* Bottom row: empty, 0, backspace */}
                <div />
                <button
                  onClick={() => handleInput(currentPin + "0")}
                  disabled={currentPin.length >= 4}
                  className="h-16 rounded-2xl bg-[#F5F5F5] text-xl font-bold text-dark active:bg-primary active:text-white transition-colors disabled:opacity-40"
                >
                  0
                </button>
                <button
                  onClick={() => {
                    setError("");
                    setPins((p) => ({ ...p, [step]: p[step].slice(0, -1) }));
                  }}
                  className="h-16 rounded-2xl bg-[#F5F5F5] flex items-center justify-center active:bg-border transition-colors"
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
