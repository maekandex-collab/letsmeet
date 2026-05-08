import Link from "next/link";

export default function SplashPage() {
  return (
    <div className="mobile-shell relative min-h-screen overflow-hidden">
      {/* Background image with gradient overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(18,21,28,0) 0%, rgba(18,21,28,0.88) 100%), url('/images/splash-bg.jpg')",
          backgroundColor: "#1a1025",
        }}
      />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-end min-h-screen pb-12 px-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
          <span className="text-white text-3xl">♥</span>
        </div>
        <h1 className="text-5xl font-bold text-white mt-2">LETSMEET</h1>
        <p className="text-sm font-semibold text-white/80 uppercase tracking-widest mt-2 mb-10">
          Match, Chat, Love!
        </p>
        <Link href="/onboarding" className="btn-primary max-w-xs mx-auto">
          Let&apos;s Start
        </Link>
      </div>
    </div>
  );
}
