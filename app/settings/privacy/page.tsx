import { BackHeader } from "@/components/Header";

const SECTIONS = [
  {
    title: "Manage Privacy",
    icon: "🛡️",
    desc: "Permission given — keep track of data and permissions you are sharing with the app and sites you use.",
  },
  {
    title: "Search Privacy",
    icon: "🔍",
    desc: "Control how people find you on LetsMeet.",
  },
  {
    title: "Blocked Contacts",
    icon: "🚫",
    desc: "Review and edit people you have blocked.",
  },
  {
    title: "Manage Data",
    icon: "📦",
    desc: "Download your data — get a copy of your account data.",
  },
  {
    title: "Correct Your Data",
    icon: "✏️",
    desc: "Request corrections to inaccurate personal data we hold about you.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Data & Privacy" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <div className="flex flex-col gap-3 mt-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-white shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#EEEEFF] flex items-center justify-center flex-shrink-0 text-xl">
                {s.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-dark">{s.title}</p>
                <p className="text-xs text-muted mt-0.5 leading-4">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
