"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/Header";
import {
  clearFeedSnapshot,
  extractError,
  getDiscoverPreferences,
  isLoggedIn,
  loadDiscoverPreferences,
  saveDiscoverPreferences,
  storeDiscoverPreferences,
  type DiscoverPreferences,
} from "@/lib/letsmeet";

const RELIGIONS = [
  { value: "", label: "Any religion" },
  { value: "Christianity", label: "Christianity" },
  { value: "Islam", label: "Islam" },
  { value: "Traditional", label: "Traditional" },
  { value: "Other", label: "Other" },
];

export default function FilterPage() {
  const router = useRouter();
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(40);
  const [religion, setReligion] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/sign-in");
      return;
    }

    const local = loadDiscoverPreferences();
    setAgeMin(local.min_age);
    setAgeMax(local.max_age);
    setReligion(local.religion);

    let cancelled = false;
    (async () => {
      const res = await getDiscoverPreferences();
      if (cancelled) return;
      if (res.ok && res.data && typeof res.data === "object") {
        const data = res.data as DiscoverPreferences;
        setAgeMin(data.min_age ?? local.min_age);
        setAgeMax(data.max_age ?? local.max_age);
        setReligion(data.religion ?? local.religion);
        storeDiscoverPreferences({
          min_age: data.min_age ?? local.min_age,
          max_age: data.max_age ?? local.max_age,
          religion: data.religion ?? local.religion,
        });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function reset() {
    setAgeMin(18);
    setAgeMax(40);
    setReligion("");
    setError("");
  }

  async function apply() {
    if (ageMin > ageMax) {
      setError("Minimum age cannot be greater than maximum age.");
      return;
    }

    const prefs: DiscoverPreferences = {
      min_age: ageMin,
      max_age: ageMax,
      religion: "",
    };

    setSaving(true);
    setError("");

    storeDiscoverPreferences(prefs);
    clearFeedSnapshot();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lm_feed_refresh", String(Date.now()));
    }

    const res = await saveDiscoverPreferences(prefs);
    if (!res.ok && res.status !== 404) {
      setError(extractError(res.data, "Saved locally; server preferences may not have updated."));
    }

    setSaving(false);
    router.push("/home");
  }

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Filter" />
      <div className="flex-1 overflow-y-auto px-5 pt-20 pb-28">
        {loading ? (
          <p className="text-sm text-muted">Loading your preferences…</p>
        ) : (
          <>
            {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

            <div className="mb-5">
              <label className="input-label mb-3 block">Age Range</label>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-dark">{ageMin} yr</span>
                <span className="text-sm font-semibold text-dark">{ageMax} yr</span>
              </div>
              <div className="relative h-2 bg-border rounded-full">
                <div
                  className="absolute h-2 bg-primary rounded-full"
                  style={{
                    left: `${((ageMin - 18) / 42) * 100}%`,
                    right: `${100 - ((ageMax - 18) / 42) * 100}%`,
                  }}
                />
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <label className="input-label">Min Age</label>
                  <input
                    type="range"
                    min={18}
                    max={60}
                    value={ageMin}
                    onChange={(e) => setAgeMin(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="input-label">Max Age</label>
                  <input
                    type="range"
                    min={18}
                    max={60}
                    value={ageMax}
                    onChange={(e) => setAgeMax(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Religion</label>
              <p className="text-xs text-muted mb-2">
                Saved for later — discover feed uses age only until the backend supports religion filtering.
              </p>
              <div className="input-wrapper">
                <select
                  className="input-field pl-4 pr-10 appearance-none"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                >
                  {RELIGIONS.map((r) => (
                    <option key={r.value || "any"} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bottom-bar flex gap-3">
        <button type="button" className="flex-1 btn-secondary" onClick={reset} disabled={saving}>
          Reset
        </button>
        <button type="button" className="flex-[2] btn-primary" onClick={apply} disabled={saving || loading}>
          {saving ? "Applying…" : "Apply Filter"}
        </button>
      </div>
    </div>
  );
}
