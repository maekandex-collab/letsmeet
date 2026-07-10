import { BackHeader } from "@/components/Header";
import LetsMeetLogo from "@/components/LetsMeetLogo";

const HOW_IT_WORKS = [
  { step: "1", label: "Sign Up / Login", desc: "Create your free account or sign in to get started." },
  { step: "2", label: "Create Profile", desc: "Add your photos, bio, interests, and preferences." },
  { step: "3", label: "Discover Matches", desc: "Browse profiles and swipe to find people you like." },
  { step: "4", label: "Start Chatting", desc: "Match with someone and start a real conversation." },
];

export default function AboutPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="About LetsMeet" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8 overflow-y-auto">

        {/* App logo */}
        <div className="flex flex-col items-center py-6 mb-2">
          <LetsMeetLogo size={72} className="mb-3" />
          <h2 className="text-xl font-bold text-dark">LetsMeet</h2>
          <p className="text-sm text-muted">Version 1.0.0</p>
        </div>

        {/* Brief description */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm mb-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">About</p>
          <p className="text-sm text-dark font-semibold mb-1">What is LetsMeet?</p>
          <p className="text-sm text-muted leading-5">
            LetsMeet is a social dating platform designed to help people connect through chats and meaningful interactions. Whether you&apos;re looking for a relationship, friendship, or casual connection — LetsMeet brings real people together.
          </p>
        </div>

        {/* Information */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm mb-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Information</p>
          <p className="text-sm text-dark font-semibold mb-1">What we offer</p>
          <p className="text-sm text-muted leading-5">
            We offer smart matchmaking, live interaction, and a safe space for you to meet people who share your interests and values.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm mb-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">How It Works</p>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark">{item.label}</p>
                  <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety note */}
        <div className="bg-primary-light rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Safety</p>
          <p className="text-sm text-dark leading-5">
            Your safety is our priority. All profiles are monitored and you can report or block any user at any time.
          </p>
        </div>

      </div>
    </div>
  );
}
