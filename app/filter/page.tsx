"use client";
import { useState } from "react";
import { BackHeader } from "@/components/Header";

const interests = ["Broadway", "Cycling", "Writing", "DAOs", "Drummer", "Gym", "Country Music", "Tea", "Hiking", "Photography"];

export default function FilterPage() {
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(40);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleInterest = (i: string) => {
    setSelected((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Filter" />
      <div className="flex-1 overflow-y-auto px-5 pt-20 pb-28">

        <div className="input-group">
          <label className="input-label">Want to Meet</label>
          <div className="input-wrapper">
            <select className="input-field pl-4 pr-10 appearance-none" defaultValue="">
              <option value="" disabled>Select...</option>
              <option>Women</option>
              <option>Men</option>
              <option>Everyone</option>
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#616568" strokeWidth="2" strokeLinecap="round" /></svg>
            </span>
          </div>
        </div>

        <div className="mb-5">
          <label className="input-label mb-3 block">Age Range</label>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-dark">{ageMin} yr</span>
            <span className="text-sm font-semibold text-dark">{ageMax} yr</span>
          </div>
          <div className="relative h-2 bg-border rounded-full">
            <div
              className="absolute h-2 bg-primary rounded-full"
              style={{ left: `${((ageMin - 18) / 42) * 100}%`, right: `${100 - ((ageMax - 18) / 42) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <label className="input-label">Min Age</label>
              <input type="range" min={18} max={60} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="flex-1">
              <label className="input-label">Max Age</label>
              <input type="range" min={18} max={60} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>
        </div>

        <div className="mb-5">
          <label className="input-label mb-3 block">Interests</label>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <button
                key={i}
                onClick={() => toggleInterest(i)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-colors ${selected.includes(i) ? "border-primary bg-primary-light text-primary" : "border-border text-dark"}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bottom-bar flex gap-3">
        <button className="flex-1 btn-secondary">Reset</button>
        <button className="flex-[2] btn-primary">Apply Filter</button>
      </div>
    </div>
  );
}
