import Link from "next/link";
import { BackHeader } from "@/components/Header";

const languages = [
  { code: "en-us", label: "English (US)", flag: "🇺🇸" },
  { code: "en-uk", label: "English (UK)", flag: "🇬🇧" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
];

export default function SelectLanguagePage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <h1 className="screen-title mb-2">Select Language</h1>
        <p className="screen-subtitle mb-6">Choose your preferred language</p>

        <div className="flex flex-col gap-2">
          {languages.map((lang, i) => (
            <label key={lang.code} className="flex items-center justify-between py-4 px-4 rounded-2xl border-2 cursor-pointer transition-colors border-border hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary-light">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-base font-semibold text-dark">{lang.label}</span>
              </div>
              <input
                type="radio"
                name="language"
                value={lang.code}
                defaultChecked={i === 0}
                className="accent-primary w-4 h-4"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="bottom-bar">
        <Link href="/setup" className="btn-primary">
          Continue
        </Link>
      </div>
    </div>
  );
}
