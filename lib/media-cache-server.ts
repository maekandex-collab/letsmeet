import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type MediaCacheEntry = {
  body: Buffer;
  contentType: string;
};

const CACHE_DIR = path.join(process.cwd(), ".cache", "letsmeet-media");

const memory = new Map<
  string,
  { body: Uint8Array; contentType: string; storedAt: number }
>();
const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;
const MEMORY_MAX = 256;

function diskPath(cacheKey: string): string {
  const hash = createHash("sha256").update(cacheKey).digest("hex");
  return path.join(CACHE_DIR, hash);
}

function getMemory(cacheKey: string): MediaCacheEntry | null {
  const hit = memory.get(cacheKey);
  if (!hit) return null;
  if (Date.now() - hit.storedAt > MEMORY_TTL_MS) {
    memory.delete(cacheKey);
    return null;
  }
  return { body: Buffer.from(hit.body), contentType: hit.contentType };
}

function setMemory(cacheKey: string, entry: MediaCacheEntry): void {
  if (memory.size >= MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(cacheKey, {
    body: new Uint8Array(entry.body),
    contentType: entry.contentType,
    storedAt: Date.now(),
  });
}

export async function readMediaCache(
  cacheKey: string
): Promise<MediaCacheEntry | null> {
  const mem = getMemory(cacheKey);
  if (mem) return mem;

  try {
    const base = diskPath(cacheKey);
    const [metaRaw, body] = await Promise.all([
      readFile(`${base}.json`, "utf8"),
      readFile(`${base}.bin`),
    ]);
    const meta = JSON.parse(metaRaw) as { contentType: string };
    const entry = { body, contentType: meta.contentType };
    setMemory(cacheKey, entry);
    return entry;
  } catch {
    return null;
  }
}

export async function writeMediaCache(
  cacheKey: string,
  entry: MediaCacheEntry
): Promise<void> {
  setMemory(cacheKey, entry);
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const base = diskPath(cacheKey);
    await Promise.all([
      writeFile(`${base}.json`, JSON.stringify({ contentType: entry.contentType })),
      writeFile(`${base}.bin`, entry.body),
    ]);
  } catch {
    // Disk cache is best-effort; memory cache still helps.
  }
}

/** Optional Redis (Upstash REST) for multi-instance deploys. */
export async function readRedisMediaCache(
  cacheKey: string
): Promise<MediaCacheEntry | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/media:${encodeURIComponent(cacheKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    if (!json.result) return null;
    const parsed = JSON.parse(json.result) as {
      contentType: string;
      body: string;
    };
    return {
      contentType: parsed.contentType,
      body: Buffer.from(parsed.body, "base64"),
    };
  } catch {
    return null;
  }
}

export async function writeRedisMediaCache(
  cacheKey: string,
  entry: MediaCacheEntry
): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  try {
    const payload = JSON.stringify({
      contentType: entry.contentType,
      body: entry.body.toString("base64"),
    });
    await fetch(`${url}/set/media:${encodeURIComponent(cacheKey)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: payload }),
      cache: "no-store",
    });
  } catch {
    // optional layer
  }
}

export async function loadCachedMedia(
  cacheKey: string
): Promise<MediaCacheEntry | null> {
  return (await readRedisMediaCache(cacheKey)) ?? (await readMediaCache(cacheKey));
}

export async function storeCachedMedia(
  cacheKey: string,
  entry: MediaCacheEntry
): Promise<void> {
  await Promise.all([
    writeMediaCache(cacheKey, entry),
    writeRedisMediaCache(cacheKey, entry),
  ]);
}
