"use client";
import { useState } from "react";
import Link from "next/link";
import { LogoHeader } from "@/components/Header";
import { InputField, SelectField } from "@/components/FormFields";

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

export default function ProfileSetupPage() {
  const [dob, setDob] = useState("");
  const [agePublic, setAgePublic] = useState(true);
  const age = calcAge(dob);

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <LogoHeader
        right={
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-border transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="#12151C" strokeWidth="2" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="#12151C" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        }
      />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <h1 className="screen-title mb-1">Profile Details</h1>
        <p className="screen-subtitle mb-6">Fill up the following details.</p>

        {/* Photo upload */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-border border-3 border-white shadow-card overflow-hidden">
              <div className="w-full h-full flex items-center justify-center bg-primary-light">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                  <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>

        <form>
          <InputField
            label="Name"
            id="name"
            type="text"
            name="name"
            placeholder="Your Name"
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

          {/* Birth date + age display + visibility */}
          <div className="input-group">
            <label htmlFor="dob" className="input-label">Birth Date</label>
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
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="input-field"
              />
              {age !== null && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-primary whitespace-nowrap">
                  {age} yrs
                </span>
              )}
            </div>

            {/* Age visibility toggle */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  {agePublic
                    ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#616568" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#616568" strokeWidth="2"/></>
                    : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#616568" strokeWidth="2" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#616568" strokeWidth="2" strokeLinecap="round"/></>
                  }
                </svg>
                <span className="text-sm text-muted">
                  Show age on profile
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAgePublic((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${agePublic ? "bg-primary" : "bg-border"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${agePublic ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          <SelectField
            label="Gender"
            id="gender"
            name="gender"
            placeholder="Select Gender"
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="9" r="5" stroke="#616568" strokeWidth="2" />
                <path d="M12 14v7M9 18h6" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
        </form>
      </div>

      <div className="bottom-bar">
        <Link href="/all-set" className="btn-primary">
          Continue
        </Link>
      </div>
    </div>
  );
}
