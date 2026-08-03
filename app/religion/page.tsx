"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Header";
import { InputField } from "@/components/FormFields";
import { getDraft, saveDraft } from "@/lib/profileDraft";
import { storeDiscoverPreferences, loadDiscoverPreferences } from "@/lib/letsmeet";

const RELIGIONS = [
  { value: "Christianity", label: "Christianity" },
  { value: "Islam", label: "Islam" },
  { value: "Traditional", label: "Traditional African Religion" },
  { value: "Other", label: "Other" },
];

function AboutYouIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke="#F759F5" strokeWidth="2" />
      <path
        d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
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
  const [occupation, setOccupation] = useState("");

  useEffect(() => {
    const draft = getDraft();
    if (draft.religion) setReligion(draft.religion);
    if (draft.occupation) setOccupation(draft.occupation);
  }, []);

  const canContinue = religion !== "" && occupation.trim() !== "";

  function clearDiscoverReligionFilter() {
    const prefs = loadDiscoverPreferences();
    storeDiscoverPreferences({ ...prefs, religion: "" });
  }

  function handleContinue() {
    if (!canContinue) return;
    saveDraft({
      religion,
      occupation: occupation.trim(),
      show_location: true,
    });
    clearDiscoverReligionFilter();
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
              <AboutYouIcon />
            </div>
          </div>
          <h1 className="screen-title mb-1 text-center">A little more about you</h1>
          <p className="text-sm text-muted text-center max-w-xs leading-5">
            Religion and occupation help us suggest more compatible matches. Your location stays on
            for nearby discovery.
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="religion" className="input-label">
            Religion *
          </label>
          <div className="input-wrapper">
            <select
              id="religion"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              required
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

        <InputField
          label="Occupation *"
          id="occupation"
          name="occupation"
          placeholder="e.g. Software Engineer, Student, Nurse"
          autoComplete="organization-title"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          className="mt-4"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="7" width="20" height="14" rx="2" stroke="#616568" strokeWidth="2" />
              <path
                d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
                stroke="#616568"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          }
        />

        {canContinue && (
          <div className="mt-5 flex items-center gap-3 bg-primary-light rounded-2xl px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <AboutYouIcon />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark">{religion}</p>
              <p className="text-xs text-muted truncate">{occupation.trim()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bottom-bar">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`btn-primary text-center ${!canContinue ? "opacity-40 pointer-events-none" : ""}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
