"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseNumericRoomId } from "@/lib/letsmeet";

function LegacyVideoRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const roomId =
      parseNumericRoomId(params.get("room")) ??
      parseNumericRoomId(params.get("chatroom"));
    if (roomId != null) {
      router.replace(`/video-call/${roomId}`);
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
