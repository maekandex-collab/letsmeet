import { getGame, type GameSlug } from "@/lib/games";

export const GAME_MESSAGE_SOURCE = "lm-game";

const TOKEN_RE =
  /^\[\[lm:(challenge|score)\|v1\|([a-z0-9-]+)\|([A-Za-z0-9_-]+)(?:\|(\d+))?\]\]$/;

export type GameChallengeKind = "challenge" | "score";

export interface GameChallengePayload {
  kind: GameChallengeKind;
  slug: GameSlug;
  challengeId: string;
  score?: number;
}

export function isGameSlug(value: string): value is GameSlug {
  return Boolean(getGame(value));
}

export function createChallengeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function encodeChallenge(slug: GameSlug, challengeId: string): string {
  return `[[lm:challenge|v1|${slug}|${challengeId}]]`;
}

export function encodeScore(
  slug: GameSlug,
  challengeId: string,
  score: number
): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
  return `[[lm:score|v1|${slug}|${challengeId}|${safe}]]`;
}

export function parseGameChallenge(text: string): GameChallengePayload | null {
  const trimmed = text.trim();
  const match = trimmed.match(TOKEN_RE);
  if (!match) return null;
  const kind = match[1] as GameChallengeKind;
  const slug = match[2];
  const challengeId = match[3];
  if (!isGameSlug(slug) || !challengeId) return null;
  if (kind === "score") {
    if (match[4] == null) return null;
    const score = Number.parseInt(match[4], 10);
    if (!Number.isFinite(score)) return null;
    return { kind, slug, challengeId, score };
  }
  return { kind, slug, challengeId };
}

export function formatGamePreview(text: string): string {
  const payload = parseGameChallenge(text);
  if (!payload) return text;
  const game = getGame(payload.slug);
  const title = game?.title ?? payload.slug;
  if (payload.kind === "score") {
    return `Scored ${payload.score ?? 0} in ${title}`;
  }
  return `Challenge: ${title}`;
}

export function isSafeChatReturnPath(path: string): boolean {
  return /^\/chat\/[A-Za-z0-9_-]+$/.test(path);
}

export function buildGamePlayHref(opts: {
  slug: GameSlug;
  roomId: string | number;
  challengeId: string;
}): string {
  const returnTo = `/chat/${opts.roomId}`;
  const params = new URLSearchParams({
    room: String(opts.roomId),
    challenge: opts.challengeId,
    returnTo,
  });
  return `/games/${opts.slug}?${params.toString()}`;
}

export interface GameScoreMessage {
  source: typeof GAME_MESSAGE_SOURCE;
  slug: string;
  score: number;
  highScore?: number;
}

export function parseGameScoreMessage(data: unknown): GameScoreMessage | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (raw.source !== GAME_MESSAGE_SOURCE) return null;
  if (typeof raw.slug !== "string" || !isGameSlug(raw.slug)) return null;
  const score = typeof raw.score === "number" ? raw.score : Number(raw.score);
  if (!Number.isFinite(score)) return null;
  const highScore =
    typeof raw.highScore === "number" && Number.isFinite(raw.highScore)
      ? raw.highScore
      : undefined;
  return { source: GAME_MESSAGE_SOURCE, slug: raw.slug, score, highScore };
}
