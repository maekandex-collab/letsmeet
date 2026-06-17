import { NextRequest, NextResponse } from "next/server";

const ALLOWED_MEDIA_HOSTS = new Set(["letsmeet.com.ng", "mtn.lenhub.net"]);

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ message: "Missing media URL." }, { status: 400 });
  }

  let source: URL;
  try {
    source = new URL(rawUrl);
  } catch {
    return NextResponse.json({ message: "Invalid media URL." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(source.protocol) || !ALLOWED_MEDIA_HOSTS.has(source.hostname)) {
    return NextResponse.json({ message: "Media host is not allowed." }, { status: 400 });
  }

  if (source.hostname === "letsmeet.com.ng") {
    source.protocol = "http:";
  }

  try {
    const upstream = await fetch(source.toString(), {
      cache: "force-cache",
      next: { revalidate: 60 * 60 },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ message: "Failed to load media." }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ message: "Failed to reach media host." }, { status: 502 });
  }
}
