"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatRoom from "@/components/ChatRoom";
import {
  bootstrapChatRoomId,
  parseNumericRoomId,
  readChatPeer,
} from "@/lib/letsmeet";

function ChatRoomRoute() {
  const params = useParams();
  const router = useRouter();
  const segment = String(params.roomId ?? "");

  const isPending = segment === "pending";
  const roomId = isPending ? null : (parseNumericRoomId(segment) ?? segment);

  useEffect(() => {
    if (!isPending) return;
    let cancelled = false;

    (async () => {
      const peer = readChatPeer();
      if (!peer?.userId) {
        router.replace("/messages");
        return;
      }

      const boot =
        peer.roomId ??
        (await bootstrapChatRoomId(peer.userId, peer.chatroomId));

      if (cancelled) return;
      if (boot != null) {
        router.replace(`/chat/${boot}`);
      } else if (peer.chatroomId) {
        router.replace(`/chat/${peer.chatroomId}`);
      } else {
        router.replace("/messages");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPending, router]);

  if (isPending) {
    return (
      <div className="mobile-shell h-screen flex items-center justify-center text-muted">
        Opening chat…
      </div>
    );
  }

  if (roomId == null) {
    return (
      <div className="mobile-shell h-screen flex flex-col items-center justify-center text-muted px-6 text-center gap-4">
        <p>Chat not found.</p>
        <a href="/messages" className="text-primary font-semibold text-sm">
          Back to messages
        </a>
      </div>
    );
  }

  return <ChatRoom roomId={roomId} />;
}

export default function ChatRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-shell h-screen flex items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <ChatRoomRoute />
    </Suspense>
  );
}
