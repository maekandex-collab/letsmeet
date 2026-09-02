"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WelcomeCarousel from "@/components/WelcomeCarousel";
import { hasValidSession } from "@/lib/letsmeet";

/**
 * USSD / SMS deep links: /splash?num=2348061583213
 * → send user to signup with phone locked so they can set a PIN.
 */
function SplashRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = (searchParams.get("num") ?? searchParams.get("phone") ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  useEffect(() => {
    // Already signed in: reuse stored JWT — skip welcome / sign-in.
    if (digits.length < 10 && hasValidSession()) {
      router.replace("/home");
      return;
    }
    if (digits.length >= 10) {
      router.replace(`/sign-up?num=${encodeURIComponent(digits)}`);
    }
  }, [digits, router]);

  if (digits.length >= 10) {
    return (
      <div className="mobile-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Opening registration…</p>
      </div>
    );
  }

  return <WelcomeCarousel />;
}

export default function SplashPage() {
  return (
    <Suspense fallback={<WelcomeCarousel />}>
      <SplashRedirect />
    </Suspense>
  );
}
