import { BackHeader } from "@/components/Header";
import { SettingsRow } from "@/components/SettingsRow";

export default function AboutPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="About LetsMeet" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        {/* App logo */}
        <div className="flex flex-col items-center py-8 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#F759F5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-dark">LetsMeet</h2>
          <p className="text-sm text-muted">Version 1.0.0</p>
        </div>

        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          {[
            { icon: "📄", label: "Terms of Service", href: "#" },
            { icon: "🔒", label: "Privacy Policy", href: "#" },
            { icon: "⭐", label: "Rate the App", href: "#" },
            { icon: "📣", label: "Follow Us on Social", href: "#" },
          ].map((row, i, arr) => (
            <div key={row.label}>
              <SettingsRow icon={<span className="text-xl">{row.icon}</span>} label={row.label} href={row.href} />
              {i < arr.length - 1 && <div className="h-px bg-border mx-5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
