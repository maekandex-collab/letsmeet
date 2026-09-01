"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/Header";
import ProfilePhoto from "@/components/ProfilePhoto";
import {
  getSingleProfile,
  likeBack,
  profileNumericId,
  swipe,
  markSwipedTarget,
  swipeTargetId,
  prefetchMedia,
  analyzeMatchCompatibility,
  buildMatchComparisonContent,
  normalizeAiAnalysis,
  extractError,
  getUser,
  getLocalProfileDraft,
  getLoginProfileCache,
  buildOwnProfileFromLoginCache,
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [analysis, setAnalysis] = useState("");

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
      const swipeId =
        source === "likes"
          ? profileNumericId({ id: Number(numericId) } as ProfileCard)
          : swipeTargetId({
              id: Number(numericId) || 0,
              user_id: hashId || "",
              swipe_user_id: numericId || undefined,
            } as ProfileCard);
      const res =
        source === "likes"
          ? await likeBack({ id: Number(numericId), user_id: hashId } as ProfileCard)
          : await swipe(swipeId, "like");
      if (source !== "likes" && res.ok) {
        markSwipedTarget(swipeId);
      }
      if (!res.ok) {
        setError(extractError(res.data, "Could not save your like."));
        return;
      }
      if (res.data?.matched) router.push("/match-found");
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
      const swipeId = swipeTargetId({
        id: Number(numericId) || 0,
        user_id: hashId || "",
        swipe_user_id: numericId || undefined,
      } as ProfileCard);
      const res =
        source === "likes"
          ? await swipe(profileNumericId({ id: Number(numericId) } as ProfileCard), "pass")
          : await swipe(swipeId, "pass");
      if (source !== "likes" && res.ok) {
        markSwipedTarget(swipeId);
      }
      router.back();
    } catch {
      router.back();
    } finally {
      setActing(false);
    }
  }

  async function handleCompare() {
    if (!profile || aiLoading) return;
    setAiError("");
    setAiLoading(true);
    try {
      const user = getUser();
      const draft = getLocalProfileDraft();
      const cache = getLoginProfileCache();
      const own = buildOwnProfileFromLoginCache(cache, user);

      const me = {
        name:
          draft?.full_name?.trim() ||
          own?.name ||
          user?.fullName?.trim() ||
          cache?.full_name?.trim() ||
          "",
        gender: draft?.gender || own?.gender || cache?.gender || "",
        about_me: draft?.about_me || "",
        location: draft?.location || "",
        religion: draft?.religion ?? null,
        interests: draft?.interests || "",
        sexual_orientation: draft?.sexual_orientation || "",
        age: own?.date_of_birth ?? null,
      };

      const them = {
        name: profile.name,
        gender: profile.gender,
        about_me: profile.about_me,
        location: profile.location,
        religion: profile.religion,
        interests: profile.interests,
        sexual_orientation: profile.sexual_orientation,
        age: displayAge(profile.date_of_birth),
      };

      const username =
        me.name || user?.fullName?.trim() || user?.phone?.trim() || "LetsMeet user";
      const content = buildMatchComparisonContent({ me, them });
      const res = await analyzeMatchCompatibility({ username, content });
      if (!res.ok) {
        setAiError(
          extractError(res.data, "Compatibility analysis is unavailable right now.")
        );
        setAnalysis("");
        return;
      }
      const text = normalizeAiAnalysis(res.data);
      if (!text) {
        setAiError("No analysis came back. Try again in a moment.");
        setAnalysis("");
        return;
      }
      setAnalysis(text);
    } catch {
      setAiError("Network error. Please try again.");
      setAnalysis("");
    } finally {
      setAiLoading(false);
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

            <div className="mb-6 rounded-3xl border border-border bg-[#FAFAFA] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-dark">Compatibility</h3>
                  <p className="text-xs text-muted mt-1 leading-5">
                    AI comparison of your profiles — shared interests, lifestyle fit, and friction.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCompare()}
                  disabled={aiLoading}
                  className="shrink-0 px-3 py-1.5 rounded-full border-2 border-primary text-primary text-xs font-bold disabled:opacity-50"
                >
                  {aiLoading ? "Analyzing…" : analysis ? "Refresh" : "Compare"}
                </button>
              </div>
              {aiError && (
                <p className="text-sm text-rose-600 mt-3">{aiError}</p>
              )}
              {analysis && !aiError && (
                <p className="text-sm text-muted leading-6 mt-3 whitespace-pre-wrap">
                  {analysis}
                </p>
              )}
            </div>
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
