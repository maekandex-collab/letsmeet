"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/Header";
import {
  getSingleProfile,
  likeUser,
  swipe,
  mediaUrl,
  type SingleProfile,
} from "@/lib/letsmeet";

function ProfileContent() {
  const router = useRouter();
  const params = useSearchParams();
  const hashId = params.get("id") ?? "";
  const numericId = params.get("uid") ?? "";

  const [profile, setProfile] = useState<SingleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hashId) {
      setError("Profile not found.");
      setLoading(false);
      return;
    }
    (async () => {
      const res = await getSingleProfile(hashId);
      if (res.ok && res.data?.profile) setProfile(res.data.profile);
      else setError("Could not load this profile.");
      setLoading(false);
    })();
  }, [hashId]);

  async function handleLike() {
    if (!numericId || acting) return;
    setActing(true);
    try {
      const res = await likeUser(numericId);
      if (res.ok && res.data?.matched) router.push("/match-found");
      else router.back();
    } catch {
      setError("Could not like this profile.");
    } finally {
      setActing(false);
    }
  }

  async function handlePass() {
    if (!numericId || acting) return;
    setActing(true);
    try {
      await swipe(numericId, "pass");
      router.back();
    } catch {
      router.back();
    } finally {
      setActing(false);
    }
  }

  const interests = (profile?.interests ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const photo = mediaUrl(profile?.profile_image);

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader
        right={
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-border transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1" fill="#12151C" />
              <circle cx="12" cy="12" r="1" fill="#12151C" />
              <circle cx="12" cy="19" r="1" fill="#12151C" />
            </svg>
          </button>
        }
      />

      {/* Hero photo */}
      <div className="pt-16">
        <div className="h-72 bg-primary-light relative overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={profile?.name ?? ""} className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4">
            {profile && (
              <h2 className="text-2xl font-bold text-white">
                {profile.name}{profile.date_of_birth ? `, ${profile.date_of_birth}` : ""}
              </h2>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-5">
        {loading && <p className="text-sm text-muted">Loading profile…</p>}
        {error && !loading && <p className="text-sm text-red-500">{error}</p>}

        {profile && !loading && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Gender", value: profile.gender || "—" },
                { label: "Orientation", value: profile.sexual_orientation || "—" },
                { label: "Religion", value: profile.religion || "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-white p-3 text-center">
                  <p className="text-sm font-bold text-dark capitalize truncate">{s.value}</p>
                  <p className="text-xs text-muted mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {profile.location && (
              <div className="flex items-center gap-2 mb-6 text-sm text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" stroke="#616568" strokeWidth="2" />
                  <circle cx="12" cy="10" r="3" stroke="#616568" strokeWidth="2" />
                </svg>
                {profile.location}
              </div>
            )}

            {profile.about_me && (
              <div className="mb-6">
                <h3 className="text-base font-bold text-dark mb-2">About Me</h3>
                <p className="text-sm text-muted leading-6">{profile.about_me}</p>
              </div>
            )}

            {interests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-bold text-dark mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((i) => (
                    <span key={i} className="px-4 py-2 rounded-full border-2 border-primary bg-primary-light text-primary text-sm font-semibold">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {numericId && (
        <div className="bottom-bar flex gap-4">
          <button
            onClick={handlePass}
            disabled={acting}
            className="w-14 h-14 rounded-full border-2 border-border bg-white shadow-card flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#F75959" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={handleLike} disabled={acting} className="flex-1 btn-primary disabled:opacity-50">
            Like ❤️
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProfileSinglePage() {
  return (
    <Suspense fallback={<div className="mobile-shell min-h-screen flex items-center justify-center text-muted">Loading…</div>}>
      <ProfileContent />
    </Suspense>
  );
}
