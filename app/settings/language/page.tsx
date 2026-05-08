import { BackHeader } from "@/components/Header";

const languages = [
  { code: "en-us", label: "English (US)", flag: "🇺🇸" },
  { code: "en-uk", label: "English (UK)", flag: "🇬🇧" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
];

export default function LanguagePage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Language" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <div className="flex flex-col gap-2 mt-4">
          {languages.map((lang, i) => (
            <label key={lang.code} className="flex items-center justify-between py-4 px-4 rounded-2xl border-2 cursor-pointer transition-colors border-border hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary-light">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-base font-semibold text-dark">{lang.label}</span>
              </div>
              <input type="radio" name="language" value={lang.code} defaultChecked={i === 0} className="accent-primary w-4 h-4" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
