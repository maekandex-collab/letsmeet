"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  parseNumericRoomId,
  stashChatPeer,
  type ProfileCard,
} from "@/lib/letsmeet";

/** Redirect legacy query-string chat URLs to clean `/chat/{roomId}` paths. */
function LegacyChatRedirect() {
  const router = useRouter();
  const params = useSearchParams(); 

  useEffect(() => {
    const id = params.get("id");
    const name = params.get("name") ?? "Chat";
    const photo = params.get("photo");
    const roomParam = params.get("room");
    const chatroomParam = params.get("chatroom");

    const roomId =
      parseNumericRoomId(roomParam) ?? parseNumericRoomId(chatroomParam);

    if (id) {
      const card: ProfileCard = {
        id: 0,
        user_id: id,
        name,
        location: "",
        age: 0, 
        profile_photo: photo,
        chatroom_id: chatroomParam ?? undefined,
        room_id: roomId ?? undefined,
      };
      stashChatPeer(card);
    }

    if (roomId != null) {
      router.replace(`/chat/${roomId}`);
    } else if (id) {
      router.replace("/chat/pending");
    } else {
      router.replace("/messages");
    }
  }, [params, router]);

  return (
    <div className="mobile-shell h-screen flex items-center justify-center text-muted">
      Redirecting…
    </div>
  );
}

export default function ChatLegacyPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell h-screen flex items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <LegacyChatRedirect />
    </Suspense>
  );
}
