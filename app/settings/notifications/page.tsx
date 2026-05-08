"use client";
import { useState } from "react";
import { BackHeader } from "@/components/Header";

const prefs = [
  { label: "SMS", desc: "Receive notifications via text message" },
  { label: "In App Notifications", desc: "Alerts inside the app" },
];

export default function NotificationsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(prefs.map((p) => [p.label, true])));

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Notifications" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm mt-4">
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
