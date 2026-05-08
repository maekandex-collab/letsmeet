import { BackHeader } from "@/components/Header";
import { SettingsRow } from "@/components/SettingsRow";

export default function PrivacyPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Data Privacy" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm mt-4">
          {[
            { icon: "📄", label: "Privacy Policy", href: "#" },
            { icon: "📋", label: "Terms of Service", href: "#" },
            { icon: "🍪", label: "Cookie Policy", href: "#" },
            { icon: "📤", label: "Export My Data", value: "Request" },
            { icon: "🗑️", label: "Delete My Data", value: "Request" },
          ].map((row, i, arr) => (
            <div key={row.label}>
              <SettingsRow icon={<span className="text-xl">{row.icon}</span>} label={row.label} value={row.value} href={row.href} />
              {i < arr.length - 1 && <div className="h-px bg-border mx-5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
