import Link from "next/link";
import LetsMeetLogo from "@/components/LetsMeetLogo";

export default function GetStartedPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen px-5">
      <div className="flex-1 flex flex-col justify-center py-10">
        <div className="flex justify-center mb-8">
          <LetsMeetLogo size={80} priority />
        </div>
        <h1 className="text-3xl font-bold text-dark text-center mb-2">Let&apos;s Get Started!</h1>
        <p className="text-base text-muted text-center mb-10">
          Let&apos;s dive in into your LetsMeet account
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/sign-up" className="btn-primary">
            Sign Up
          </Link>
          <Link href="/sign-in" className="btn-accent-outline">
            Sign In
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="py-5 text-center">
        <p className="text-sm text-muted">
          <Link href="/settings/privacy" className="text-dark font-medium hover:text-primary">
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link href="/settings/privacy" className="text-dark font-medium hover:text-primary">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
