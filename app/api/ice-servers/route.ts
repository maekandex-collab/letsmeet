import { NextResponse } from "next/server";
import { buildIceServersFromEnv } from "@/lib/iceServers";

/**
 * Returns TURN/STUN config from server env so Coolify/Vercel can set
 * TURN_USERNAME / TURN_CREDENTIAL without relying on the empty upstream
 * GET /video_audio payload.
 */
export async function GET() {
  const iceServers = buildIceServersFromEnv({
    turnUrls:
      process.env.TURN_URLS ||
      process.env.NEXT_PUBLIC_TURN_URLS ||
      [
        "turn:turner.lenhub.net:3478?transport=udp",
        "turn:turner.lenhub.net:3478?transport=tcp",
      ].join(","),
    turnUsername:
      process.env.TURN_USERNAME ||
      process.env.NEXT_PUBLIC_TURN_USERNAME ||
      "webrtc",
    turnCredential:
      process.env.TURN_CREDENTIAL ||
      process.env.NEXT_PUBLIC_TURN_CREDENTIAL ||
      "YourStrongPassword123!",
    stunUrls:
      process.env.STUN_URLS ||
      process.env.NEXT_PUBLIC_STUN_URLS ||
      "stun:stun.l.google.com:19302",
  });

  if (!iceServers) {
    return NextResponse.json({ iceServers: [] }, { status: 200 });
  }

  return NextResponse.json(
    { iceServers, source: "env" },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
