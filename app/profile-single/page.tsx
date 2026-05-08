import Link from "next/link";
import { BackHeader } from "@/components/Header";

const interests = ["Photography", "Hiking", "Cooking", "Travel", "Music"];

export default function ProfileSinglePage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader
        right={
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-border transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1" fill="#12151C" />
              <circle cx="12" cy="12" r="1" fill="#12151C" />
              <circle cx="12" cy="19" r="1" fill="#12151C" />
            </svg>
          </button>
        }
      />

      {/* Hero photo */}
      <div className="pt-16">
        <div className="h-72 bg-primary-light relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
              <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-white/80 text-sm">Online</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Sophiya Calzoni, 24</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Height", value: "5'6\"" },
            { label: "Ethnicity", value: "Asian" },
            { label: "Religion", value: "Christian" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-white p-3 text-center">
              <p className="text-base font-bold text-dark">{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-dark mb-2">About Me</h3>
          <p className="text-sm text-muted leading-6">
            Hi! I&apos;m Sophiya, a passionate photographer and avid hiker. I love exploring new places and meeting interesting people. When I&apos;m not behind a camera, you&apos;ll find me trying new recipes in the kitchen 🌿
          </p>
        </div>

        {/* Interests */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-dark mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span key={i} className="px-4 py-2 rounded-full border-2 border-primary bg-primary-light text-primary text-sm font-semibold">
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="bottom-bar flex gap-4">
        <button className="w-14 h-14 rounded-full border-2 border-border bg-white shadow-card flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#F75959" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/match-found" className="flex-1 btn-primary">
          Like ❤️
        </Link>
        <Link href="/chat" className="w-14 h-14 rounded-full border-2 border-border bg-white shadow-card flex items-center justify-center hover:border-primary hover:bg-primary-light transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#12151C" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
