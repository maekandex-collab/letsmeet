"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getMatchedList, mediaUrl, type ProfileCard } from "@/lib/letsmeet";

function normalize(data: ProfileCard[] | ProfileCard | null | undefined): ProfileCard[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export default function MessagesPage() {
  const [matches, setMatches] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getMatchedList();
      if (res.ok) setMatches(normalize(res.data));
      setLoading(false);
    })();
  }, []);

  const filtered = matches.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <LogoHeader />
      <div className="flex-1 overflow-y-auto pt-20 pb-28">
        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#616568" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-border text-sm font-medium text-dark placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-muted">Loading conversations…</p>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#F759F5" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-muted">No conversations yet. Match with someone to start chatting!</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((c) => {
              const photo = mediaUrl(c.profile_photo);
              return (
                <Link
                  key={c.user_id}
                  href={`/chat?id=${encodeURIComponent(c.user_id)}&room=${c.id}&name=${encodeURIComponent(c.name)}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-border/40 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden bg-primary-light">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                          <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-bold text-dark truncate">{c.name}</p>
                    </div>
                    <p className="text-sm text-muted truncate mt-0.5">
                      {c.location || "Tap to start chatting"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
