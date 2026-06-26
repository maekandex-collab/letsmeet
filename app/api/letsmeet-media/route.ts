import { NextRequest, NextResponse } from "next/server";
import { mediaUpstreamUrls, normalizeMediaInput } from "@/lib/letsmeet";
import { loadCachedMedia, storeCachedMedia } from "@/lib/media-cache-server";

const ALLOWED_MEDIA_HOSTS = new Set(["letsmeet.com.ng", "mtn.lenhub.net"]);

function resolveFetchTargets(rawUrl: string): { cacheKey: string; targets: string[] } {
  const cleanPath = normalizeMediaInput(rawUrl);
  if (cleanPath && cleanPath.startsWith("/")) {
    return { cacheKey: cleanPath, targets: mediaUpstreamUrls(cleanPath) };
  }

  try {
    const source = new URL(rawUrl);
    if (!ALLOWED_MEDIA_HOSTS.has(source.hostname)) {
      return { cacheKey: rawUrl, targets: [] };
    }
    const fixedPath = normalizeMediaInput(source.toString());
    if (fixedPath && fixedPath.startsWith("/")) {
      return { cacheKey: fixedPath, targets: mediaUpstreamUrls(fixedPath) };
    }
    return { cacheKey: rawUrl, targets: [source.toString()] };
  } catch {
    return { cacheKey: rawUrl, targets: [] };
  }
}

function prepareFetchUrl(target: string): string {
  try {
    const url = new URL(target);
    if (url.hostname === "letsmeet.com.ng") {
      url.protocol = "http:";
      return url.toString();
    }
  } catch {
    // use target as-is
  }
  return target;
}

async function fetchMedia(target: string): Promise<{ buffer: Buffer; contentType: string; source: string } | null> {
  try {
    const res = await fetch(prepareFetchUrl(target), { cache: "no-store" });
    if (!res.ok || !res.body) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { buffer, contentType, source: target };
  } catch {
    return null;
  }
}

async function fetchFirstAvailable(
  targets: string[]
): Promise<{ buffer: Buffer; contentType: string; source: string } | null> {
  if (targets.length === 0) return null;
  if (targets.length === 1) return fetchMedia(targets[0]);

  const results = await Promise.all(targets.map((t) => fetchMedia(t)));
  return results.find((r) => r != null) ?? null;
}

function toResponseBody(buffer: Buffer): BodyInit {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ message: "Missing media URL." }, { status: 400 });
  }

  const { cacheKey, targets } = resolveFetchTargets(rawUrl);
  if (targets.length === 0) {
    return NextResponse.json({ message: "Invalid media URL." }, { status: 400 });
  }

  const cached = await loadCachedMedia(cacheKey);
  if (cached) {
    return new NextResponse(toResponseBody(cached.body), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Content-Length": String(cached.body.byteLength),
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Media-Cache": "HIT",
      },
    });
  }

  const upstream = await fetchFirstAvailable(targets);
  if (!upstream) {
    return NextResponse.json({ message: "Failed to load media." }, { status: 502 });
  }

  void storeCachedMedia(cacheKey, {
    body: upstream.buffer,
    contentType: upstream.contentType,
  });

  return new NextResponse(toResponseBody(upstream.buffer), {
    status: 200,
    headers: {
      "Content-Type": upstream.contentType,
      "Content-Length": String(upstream.buffer.byteLength),
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Media-Cache": "MISS",
      "X-Media-Source": upstream.source,
    },
  });
}
