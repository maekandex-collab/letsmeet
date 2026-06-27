"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { saveDraft } from "@/lib/profileDraft";
import { storeDiscoverPreferences, loadDiscoverPreferences } from "@/lib/letsmeet";

const RELIGIONS = [
  { value: "Christianity", label: "Christianity" },
  { value: "Islam", label: "Islam" },
  { value: "Traditional", label: "Traditional African Religion" },
  { value: "Other", label: "Other" },
];

function FaithIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2v20M8 6h8M6 10h12"
        stroke="#F759F5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ReligionPage() {
  const router = useRouter();
  const [religion, setReligion] = useState("");

  const canContinue = religion !== "";

  function handleContinue() {
    saveDraft({ religion, show_location: true });
    const prefs = loadDiscoverPreferences();
    storeDiscoverPreferences({ ...prefs, religion: "" });
    router.push("/profile-setup");
  }

  function handleSkip() {
    saveDraft({ show_location: true });
    const prefs = loadDiscoverPreferences();
    storeDiscoverPreferences({ ...prefs, religion: "" });
    router.push("/profile-setup");
  }

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />

      <div className="flex-1 flex flex-col px-5 pt-6 pb-32">
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center mb-5">
            <div className="absolute w-36 h-36 rounded-full bg-primary/5" />
            <div className="absolute w-24 h-24 rounded-full bg-primary/10" />
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
              <FaithIcon />
            </div>
          </div>
          <h1 className="screen-title mb-1 text-center">What&apos;s your religion?</h1>
          <p className="text-sm text-muted text-center max-w-xs leading-5">
            This helps us suggest more compatible matches. Your location stays on for nearby
            discovery.
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="religion" className="input-label">
            Religion
          </label>
          <div className="input-wrapper">
            <select
              id="religion"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              className="input-field appearance-none cursor-pointer pl-4 pr-10"
            >
              <option value="" disabled>
                Select your religion
              </option>
              {RELIGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 9L12 15L18 9"
                  stroke="#616568"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>

        {canContinue && (
          <div className="mt-5 flex items-center gap-3 bg-primary-light rounded-2xl px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <FaithIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark">{religion}</p>
              <p className="text-xs text-muted">Used for match preferences</p>
            </div>
          </div>
        )}
      </div>

      <div className="bottom-bar flex-col gap-3">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`btn-primary text-center ${!canContinue ? "opacity-40 pointer-events-none" : ""}`}
        >
          Continue
        </button>
        <button onClick={handleSkip} className="btn-secondary text-center">
          Skip for now
        </button>
      </div>
    </div>
  );
}
