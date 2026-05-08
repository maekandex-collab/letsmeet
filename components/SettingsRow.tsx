import React from "react";
import Link from "next/link";

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
}

export function SettingsRow({ icon, label, value, href, onClick }: SettingsRowProps) {
  const inner = (
    <div className="settings-row">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="settings-icon-box">{icon}</div>
        <span className="text-base font-semibold text-dark truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {value && <span className="text-sm text-muted">{value}</span>}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 6L15 12L9 18" stroke="#12151C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{inner}</Link>;
  }
  return <button onClick={onClick} className="w-full text-left">{inner}</button>;
}
