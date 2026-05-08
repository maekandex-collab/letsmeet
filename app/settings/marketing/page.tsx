"use client";
import { useState } from "react";
import { BackHeader } from "@/components/Header";

const prefs = [
  { label: "Email Newsletters", desc: "Receive tips and product updates" },
  { label: "SMS Promotions", desc: "Deals sent to your phone" },
  { label: "Partner Offers", desc: "Offers from trusted partners" },
];

export default function MarketingPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(prefs.map((p) => [p.label, false])));

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Marketing Preferences" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <p className="text-sm text-muted mt-4 mb-5 leading-5">Control how LetsMeet communicates promotional information with you.</p>
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {prefs.map((p, i) => (
            <div key={p.label}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-dark">{p.label}</p>
                  <p className="text-xs text-muted mt-0.5">{p.desc}</p>
                </div>
                <button
                  onClick={() => setEnabled((prev) => ({ ...prev, [p.label]: !prev[p.label] }))}
                  className={`w-12 h-6 rounded-full transition-colors ${enabled[p.label] ? "bg-primary" : "bg-border"}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${enabled[p.label] ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
              {i < prefs.length - 1 && <div className="h-px bg-border mx-5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
