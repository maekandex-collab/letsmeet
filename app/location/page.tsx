"use client";

import { useState } from "react";
import Link from "next/link";
import { BackHeader } from "@/components/Header";

// ── Geographic data ────────────────────────────────────────────────────────────

const LOCATION_DATA: Record<string, { name: string; flag: string; states: string[] }> = {
  NG: {
    name: "Nigeria",
    flag: "🇳🇬",
    states: [
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
      "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
      "FCT – Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
      "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
      "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
    ],
  },
  GH: {
    name: "Ghana",
    flag: "🇬🇭",
    states: [
      "Ashanti", "Brong-Ahafo", "Central", "Eastern", "Greater Accra",
      "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West",
      "Volta", "Western", "Western North",
    ],
  },
  ZA: {
    name: "South Africa",
    flag: "🇿🇦",
    states: [
      "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
      "Mpumalanga", "North West", "Northern Cape", "Western Cape",
    ],
  },
  KE: {
    name: "Kenya",
    flag: "🇰🇪",
    states: [
      "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika",
      "Malindi", "Kitale", "Garissa", "Kakamega",
    ],
  },
  GB: {
    name: "United Kingdom",
    flag: "🇬🇧",
    states: ["England", "Northern Ireland", "Scotland", "Wales"],
  },
  US: {
    name: "United States",
    flag: "🇺🇸",
    states: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
      "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
      "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
      "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
      "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
      "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
      "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
      "Washington", "West Virginia", "Wisconsin", "Wyoming",
    ],
  },
  CA: {
    name: "Canada",
    flag: "🇨🇦",
    states: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick",
      "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
      "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
      "Saskatchewan", "Yukon",
    ],
  },
  AU: {
    name: "Australia",
    flag: "🇦🇺",
    states: [
      "Australian Capital Territory", "New South Wales", "Northern Territory",
      "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia",
    ],
  },
};

const COUNTRY_LIST = Object.entries(LOCATION_DATA).map(([code, { name, flag }]) => ({
  code,
  name,
  flag,
}));

// ── Icons ──────────────────────────────────────────────────────────────────────

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#616568" strokeWidth="2" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MapPinIcon({ color = "#616568" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#616568" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="#616568" strokeWidth="2" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LocationPage() {
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [locationPublic, setLocationPublic] = useState(true);

  const states = country ? (LOCATION_DATA[country]?.states ?? []) : [];
  const selectedCountry = LOCATION_DATA[country];
  const canContinue = country !== "" && state !== "";

  function handleCountryChange(code: string) {
    setCountry(code);
    setState("");
  }

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />

      <div className="flex-1 flex flex-col px-5 pt-6 pb-32">
        {/* Header visual */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center mb-5">
            <div className="absolute w-36 h-36 rounded-full bg-primary/5" />
            <div className="absolute w-24 h-24 rounded-full bg-primary/10" />
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
              <MapPinIcon color="#F759F5" />
            </div>
          </div>
          <h1 className="screen-title mb-1 text-center">Where are you from?</h1>
          <p className="text-sm text-muted text-center max-w-xs leading-5">
            Choose your country and state so we can show you better matches nearby.
          </p>
        </div>

        {/* Country picker */}
        <div className="input-group">
          <label htmlFor="country" className="input-label">Country</label>
          <div className="input-wrapper">
            <span className="input-icon"><GlobeIcon /></span>
            <select
              id="country"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="input-field appearance-none cursor-pointer pl-14 pr-10"
            >
              <option value="" disabled>Select your country</option>
              {COUNTRY_LIST.map(({ code, name, flag }) => (
                <option key={code} value={code}>
                  {flag}  {name}
                </option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>

        {/* State picker — only shown once country is selected */}
        <div className={`input-group transition-opacity duration-200 ${country ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <label htmlFor="state" className="input-label">
            {selectedCountry ? `State / Region` : "State / Region"}
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><MapPinIcon /></span>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={!country}
              className="input-field appearance-none cursor-pointer pl-14 pr-10"
            >
              <option value="" disabled>
                {country ? `Select a state in ${selectedCountry?.name}` : "Select country first"}
              </option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>

        {/* Location visibility toggle */}
        <div className="mt-2 px-1 py-3 flex items-center justify-between border border-border rounded-2xl px-4">
          <div className="flex items-center gap-2.5">
            <EyeIcon open={locationPublic} />
            <div>
              <p className="text-sm font-semibold text-dark">Show location on profile</p>
              <p className="text-xs text-muted mt-0.5">
                {locationPublic ? "Visible to others" : "Hidden from others"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocationPublic((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${locationPublic ? "bg-primary" : "bg-border"}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${locationPublic ? "left-5" : "left-0.5"}`}
            />
          </button>
        </div>

        {/* Current selection preview */}
        {canContinue && (
          <div className="mt-5 flex items-center gap-3 bg-primary-light rounded-2xl px-4 py-3">
            <span className="text-2xl">{selectedCountry?.flag}</span>
            <div>
              <p className="text-sm font-semibold text-dark">{state}</p>
              <p className="text-xs text-muted">{selectedCountry?.name}</p>
            </div>
            {locationPublic && (
              <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Visible
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bottom-bar flex-col gap-3">
        <Link
          href={canContinue ? "/profile-setup" : "#"}
          className={`btn-primary text-center ${!canContinue ? "opacity-40 pointer-events-none" : ""}`}
        >
          Continue
        </Link>
        <Link href="/profile-setup" className="btn-secondary text-center">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
