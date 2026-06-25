"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/Header";
import ProfilePhoto from "@/components/ProfilePhoto";
import {
  getSingleProfile,
  likeBack,
  swipe,
  markSwipedTarget,
  prefetchMedia,
  type SingleProfile,
  type ProfileCard,
} from "@/lib/letsmeet";

function displayAge(value: number | string | undefined): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return String(value);
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const birth = new Date(raw);
    if (Number.isNaN(birth.getTime())) return null;
    const age = Math.floor(
      (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return age > 0 && age < 120 ? String(age) : null;
  }
  if (/^\d{1,3}$/.test(raw)) return raw;
  return null;
}

function ProfileContent() {
  const router = useRouter();
  const params = useSearchParams();
  const hashId = params.get("id") ?? "";
  const numericId = params.get("uid") ?? "";
  const source = params.get("source") ?? "discover";

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
      if (res.ok && res.data?.profile) {
        setProfile(res.data.profile);
        prefetchMedia([res.data.profile.profile_image], 1);
      } else setError("Could not load this profile.");
      setLoading(false);
    })();
  }, [hashId]);

  async function handleLike() {
    if (!numericId || acting) return;
    setActing(true);
    try {
      const res =
        source === "likes"
          ? await likeBack({ id: Number(numericId), user_id: hashId } as ProfileCard)
          : await swipe(numericId, "like");
      if (source !== "likes" && (res.ok || res.status === 400)) {
        markSwipedTarget(numericId);
      }
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
      const res = await swipe(
        source === "likes" ? String(numericId) : numericId,
        "pass"
      );
      if (source !== "likes" && (res.ok || res.status === 400)) {
        markSwipedTarget(numericId);
      }
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
  const photo = profile?.profile_image;
  const age = displayAge(profile?.date_of_birth);

  return (
    <div className="mobile-shell flex flex-col min-h-screen bg-white">
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
      <div className="pt-16 px-3 sm:px-4">
        <div
          className="relative mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] bg-[#151515]"
          style={{
            height: "clamp(380px, 54dvh, 520px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          }}
        >
          {photo ? (
            <ProfilePhoto photo={photo} alt={profile?.name ?? "Profile photo"} priority />
          ) : (
            <div className="absolute inset-0 bg-primary-light flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                <path
                  d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20"
                  stroke="#F759F5"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

          <div className="absolute bottom-0 left-0 right-0 p-5 pb-6 pointer-events-none">
            {profile && (
              <>
                <h2 className="text-[1.65rem] font-bold text-white leading-tight">
                  {profile.name}
                  {age ? `, ${age}` : ""}
                </h2>
                {profile.location && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                    </svg>
                    <span className="text-white/80 text-sm">{profile.location}</span>
                  </div>
                )}
              </>
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
