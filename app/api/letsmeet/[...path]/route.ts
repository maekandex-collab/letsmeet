import { NextRequest, NextResponse } from "next/server";

const BASE_URL =
  process.env.LETSMEET_API_BASE_URL ?? "https://mtn.lenhub.net";

// Upstream endpoints that require a trailing slash (Django/Ninja style).
// The client always calls our proxy WITHOUT trailing slashes; we add them here
// so a redirect never drops the POST body.
const TRAILING_SLASH = new Set([
  "create/user",
  "login/user",
  "user/profile",
  "single/user/profile",
  "matched/list",
]);

function buildUpstreamUrl(segments: string[], search: string): string {
  const joined = segments.join("/");
  const suffix = TRAILING_SLASH.has(joined) ? "/" : "";
  return `${BASE_URL}/api/letsmeet/${joined}${suffix}${search}`;
}

async function forward(req: NextRequest, segments: string[]) {
  const search = req.nextUrl.search ?? "";
  const target = buildUpstreamUrl(segments, search);

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      // Re-send as FormData so fetch sets a fresh multipart boundary.
      init.body = await req.formData();
    } else {
      const body = await req.text();
      if (body) {
        headers["Content-Type"] = contentType || "application/json";
        init.body = body;
      }
    }
  }

  try {
    const res = await fetch(target, init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to reach LetsMeet backend." },
      { status: 502 }
    );
  }
}

interface RouteContext {
  params: { path: string[] };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  return forward(req, params.path);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return forward(req, params.path);
}
