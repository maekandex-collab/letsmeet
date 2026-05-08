import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-white overflow-hidden">

      {/* Hero section — takes most of the screen */}
      <div className="relative flex-shrink-0" style={{ height: "62vh", minHeight: 360 }}>
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, #f9d0f8 0%, #FAE8F9 50%, #ede0fb 100%)",
            borderBottomLeftRadius: "50% 12%",
            borderBottomRightRadius: "50% 12%",
          }}
        />

        {/* Decorative blobs */}
        <div className="absolute top-10 left-8 w-24 h-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute bottom-16 right-6 w-32 h-32 rounded-full bg-accent/10 blur-3xl" />

        {/* Central heart illustration */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Outer glow ring */}
            <div className="absolute w-52 h-52 rounded-full bg-primary/10" />
            <div className="absolute w-40 h-40 rounded-full bg-primary/15" />
            {/* Icon card */}
            <div className="relative w-28 h-28 rounded-3xl bg-white shadow-xl flex items-center justify-center rotate-[-6deg]">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  fill="#F759F5"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Floating pill badges */}
        <div className="absolute top-16 right-8 bg-white rounded-2xl px-3 py-2 shadow-md flex items-center gap-2 rotate-[6deg]">
          <span className="text-lg">🔥</span>
          <span className="text-xs font-bold text-dark">New Matches</span>
        </div>
        <div className="absolute bottom-24 left-6 bg-white rounded-2xl px-3 py-2 shadow-md flex items-center gap-2 rotate-[-4deg]">
          <span className="text-lg">💬</span>
          <span className="text-xs font-bold text-dark">Start Chatting</span>
        </div>
      </div>

      {/* Text content */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 pt-8 pb-2 text-center">
        <div className="w-10 h-1 rounded-full bg-primary mb-6" />
        <h1 className="text-[30px] font-bold text-dark leading-snug mb-3">
          Find Your Perfect{" "}
          <span className="text-primary">Match</span> Today
        </h1>
        <p className="text-[15px] text-muted leading-6">
          Millions of real people looking for meaningful connections — just like you.
        </p>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 pt-4 flex flex-col items-center gap-3">
        <Link href="/get-started" className="btn-primary">
          Get Started ✨
        </Link>
        <p className="text-xs text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary font-semibold">
            Sign In
          </Link>
        </p>
      </div>

    </div>
  );
}
