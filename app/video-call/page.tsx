"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LegacyVideoRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const room =
      params.get("room")?.trim() ||
      params.get("chatroom")?.trim() ||
      "";
    if (room) {
      router.replace(`/video-call/${room}`);
    } else {
      router.replace("/messages");
    }
  }, [params, router]);

  return (
    <div className="mobile-shell h-screen flex items-center justify-center text-white bg-dark">
      Redirecting…
    </div>
  );
}

export default function VideoCallLegacyPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell h-screen flex items-center justify-center text-white bg-dark">
          Loading…
        </div>
      }
    >
      <LegacyVideoRedirect />
    </Suspense>
  );
}
