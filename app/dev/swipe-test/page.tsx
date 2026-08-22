"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  extractError,
  getFeed,
  getLikeList,
  getToken,
  getUser,
  parseProfileCards,
  swipe,
  swipeTargetId,
  type ProfileCard,
} from "@/lib/letsmeet";

const AGE_RANGES: Array<{ min: number; max: number }> = [
  { min: 18, max: 30 },
  { min: 18, max: 25 },
  { min: 20, max: 22 },
  { min: 18, max: 99 },
];

export default function DevSwipeTestPage() {
  const [mounted, setMounted] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [searchName, setSearchName] = useState("Benedict");
  const [busy, setBusy] = useState("");
  const [lastResult, setLastResult] = useState("");
  const [likeList, setLikeList] = useState<ProfileCard[]>([]);
  const [scanHits, setScanHits] = useState<ProfileCard[]>([]);
  const [scanTotal, setScanTotal] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getUser() : null;
  const token = mounted ? getToken() : null;

  const refreshLikes = useCallback(async () => {
    setBusy("likes");
    const res = await getLikeList();
    setLikeList(res.ok ? parseProfileCards(res.data) : []);
    setBusy("");
  }, []);

  useEffect(() => {
    if (token) void refreshLikes();
  }, [token, refreshLikes]);

  if (process.env.NODE_ENV === "production") {
    return (
      <main className="min-h-screen p-6 bg-white text-gray-900">
        <p>Not available in production.</p>
        <Link href="/home" className="text-pink-500 underline mt-4 inline-block">
          Back to Home
        </Link>
      </main>
    );
  }

  if (!mounted) return null;

  if (!token || !user) {
    return (
      <main className="min-h-screen p-6 bg-white text-gray-900 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-2">Dev swipe test</h1>
        <p className="text-sm text-gray-600 mb-4">
          Sign in first, then return here to bypass the discover feed when you have a swipe{" "}
          <code className="text-xs bg-gray-100 px-1">user_id</code>.
        </p>
        <Link href="/sign-in" className="text-pink-500 underline">
          Sign in
        </Link>
      </main>
    );
  }

  async function runSwipe(type: "like" | "pass") {
    const id = targetId.trim();
    if (!id) {
      setLastResult("Enter a swipe user_id first.");
      return;
    }
    setBusy(type);
    const res = await swipe(id, type);
    setLastResult(
      res.ok
        ? `POST /swipe ${type} → ${JSON.stringify(res.data)}`
        : `Failed: ${extractError(res.data, `HTTP ${res.status}`)}`
    );
    setBusy("");
    await refreshLikes();
  }

  async function scanFeed() {
    setBusy("scan");
    const needle = searchName.trim().toLowerCase();
    const hits: ProfileCard[] = [];
    const allCards: ProfileCard[] = [];
    const seen = new Set<string>();

    const collect = (cards: ProfileCard[]) => {
      for (const card of cards) {
        const key = swipeTargetId(card);
        if (seen.has(key)) continue;
        seen.add(key);
        allCards.push(card);
        if (!needle || card.name.toLowerCase().includes(needle)) {
          hits.push(card);
        }
      }
    };

    for (const range of AGE_RANGES) {
      const res = await getFeed({ min_age: range.min, max_age: range.max });
      if (!res.ok) continue;
      collect(parseProfileCards(res.data));
    }

    const bare = await getFeed();
    if (bare.ok) collect(parseProfileCards(bare.data));

    setScanTotal(allCards.length);
    setScanHits(hits);
    const samples = allCards
      .slice(0, 5)
      .map((c) => c.name.split(/\s+/)[0])
      .join(", ");
    setLastResult(
      needle
        ? `Scanned ${allCards.length} unique profile(s) across feed requests — ${hits.length} matching "${searchName}". Sample in pool: ${samples || "none"}.`
        : `Showing ${hits.length} unique profile(s) from feed. Sample: ${samples || "none"}.`
    );
    setBusy("");
  }

  return (
    <main className="min-h-screen p-6 pb-24 bg-white text-gray-900 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dev swipe test</h1>
        <p className="text-sm text-gray-600 mt-1">
          Bypass discover when feed does not show your test accounts. Swipe API needs the long{" "}
          <strong>feed user_id</strong>, not phone or JWT id ({user.userId}).
        </p>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-semibold text-amber-900">Why Benedict accounts miss each other</p>
        <p className="text-amber-800 mt-1">
          API checks confirm female jwt <code>603</code> and male jwt <code>643</code> never appear
          in each other&apos;s <code>GET /feed</code> responses. That is backend discover indexing
          (new accounts / missing location), not a frontend swipe bug.
        </p>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <p className="text-sm">
          Signed in as <strong>{user.fullName ?? "—"}</strong> · JWT id{" "}
          <code className="bg-gray-100 px-1">{user.userId}</code>
          {user.phone ? ` · ${user.phone}` : ""}
        </p>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Direct swipe (no feed)</h2>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Target swipe user_id (10+ digits)"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void runSwipe("like")}
            className="flex-1 rounded-lg bg-pink-500 text-white py-2 text-sm font-medium disabled:opacity-50"
          >
            Like
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void runSwipe("pass")}
            className="flex-1 rounded-lg border py-2 text-sm font-medium disabled:opacity-50"
          >
            Pass
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">Feed scanner</h2>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Name contains…"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void scanFeed()}
          className="w-full rounded-lg border py-2 text-sm font-medium disabled:opacity-50"
        >
          Scan feed (all age ranges)
        </button>
        {scanTotal > 0 && scanHits.length === 0 && searchName.trim() && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Feed is working ({scanTotal} profiles scanned) but &quot;{searchName}&quot; is not in
            this account&apos;s discover pool — backend indexing, not a frontend bug.
          </p>
        )}
        {scanHits.length > 0 && (
          <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
            {scanHits.map((c) => (
              <li key={swipeTargetId(c)} className="border rounded p-2">
                <div className="font-medium">{c.name}</div>
                <div>swipe_id: {swipeTargetId(c)}</div>
                <div>age: {c.age ?? "—"} · id: {c.id}</div>
                <button
                  type="button"
                  className="text-pink-600 underline mt-1"
                  onClick={() => setTargetId(swipeTargetId(c))}
                >
                  Use as target
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Liked you</h2>
          <button type="button" className="text-sm text-pink-600" onClick={() => void refreshLikes()}>
            Refresh
          </button>
        </div>
        {likeList.length === 0 ? (
          <p className="text-sm text-gray-500">Empty — nobody has liked this account yet.</p>
        ) : (
          <ul className="text-xs space-y-2">
            {likeList.map((c) => (
              <li key={`${c.id}-${c.user_id}`} className="border rounded p-2">
                <div className="font-medium">{c.name}</div>
                <div>user_id: {c.user_id} · id: {c.id}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastResult && (
        <pre className="text-xs bg-gray-100 rounded-lg p-3 whitespace-pre-wrap break-all">
          {lastResult}
        </pre>
      )}

      <Link href="/matches" className="text-pink-500 underline text-sm block">
        Open Matches UI →
      </Link>
    </main>
  );
}
