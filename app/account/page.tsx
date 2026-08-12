"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProfilePhotoEditor, {
  emptyPhotoSlot,
  photoSlotsFromUrls,
  type ProfilePhotoSlot,
} from "@/components/ProfilePhotoEditor";
import {
  getUser,
  clearSession,
  isLoggedIn,
  fetchMyProfile,
  fetchMediaBlob,
  prefetchMedia,
  getLoginProfileCache,
  profileImageUrlsFromCache,
  getLocalProfileDraft,
  profileImageUrlsFromDraft,
  storeLoginProfileCache,
  clearLoginProfileCache,
  clearStoredHashedUserId,
  profileMatchesSession,
  saveAccountProfile,
  clearMediaCache,
} from "@/lib/letsmeet";

const SETTINGS = [
  {
    label: "Security",
    href: "/settings/security",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#3E36ED" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Notification Settings",
    href: "/settings/notifications",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "FAQs",
    href: "/settings/faq",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#3E36ED" strokeWidth="2"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="17" r=".5" fill="#3E36ED" stroke="#3E36ED"/>
      </svg>
    ),
  },
  {
    label: "Data & Privacy Policy",
    href: "/settings/privacy",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="#3E36ED" strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "About LetsMeet",
    href: "/settings/about",
    meta: "v1.0.1",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#3E36ED" strokeWidth="2"/>
        <path d="M12 16v-5M12 8v-.01" stroke="#3E36ED" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Contact Us",
    href: "/settings/contact",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="#3E36ED" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Invite Friends",
    href: "/settings/invite",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="#3E36ED" strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

type BannerTone = "warning" | "error" | "success";

const BANNER_STYLES: Record<BannerTone, string> = {
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  error: "bg-red-50 border-red-200 text-red-600",
  success: "bg-green-50 border-green-200 text-green-700",
};

function BannerIcon({ tone }: { tone: BannerTone }) {
  if (tone === "success") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v5M12 16v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
      <path d="M12 9v4M12 16.5v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.29 3.86L1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Banner({ tone, children }: { tone: BannerTone; children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-2 text-xs font-medium border rounded-2xl px-3.5 py-3 ${BANNER_STYLES[tone]}`}>
      <BannerIcon tone={tone} />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
      {children}
    </span>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [photos, setPhotos] = useState<ProfilePhotoSlot[]>([
    emptyPhotoSlot(),
    emptyPhotoSlot(),
    emptyPhotoSlot(),
  ]);

  const [aboutMe, setAboutMe] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [religion, setReligion] = useState<string | null>(null);
  const [profileAge, setProfileAge] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [localOnlyNotice, setLocalOnlyNotice] = useState("");

  function applyProfilePhotos(urls: [string | null, string | null, string | null]) {
    prefetchMedia(urls.filter(Boolean) as string[], 3);
    setPhotos(photoSlotsFromUrls(urls));
  }

  /**
   * Apply whatever profile data we already have locally (from the login
   * response cache or an unsynced local draft) and report whether it's
   * enough to consider the page "loaded" — i.e. gender + at least one
   * photo, the only two fields this screen actually requires to function.
   */
  const applyLoginCacheFallback = useCallback((): boolean => {
    const sessionName = (getUser()?.fullName ?? "").trim();
    const draft = getLocalProfileDraft();
    if (draft) {
      if (draft.full_name && profileMatchesSession(draft.full_name, sessionName)) {
        setName((prev) => prev || draft.full_name || "");
      }
      if (draft.gender) setGender(draft.gender.toLowerCase());
      if (draft.about_me) setAboutMe(draft.about_me);
      if (draft.location) setLocation(draft.location);
      if (draft.interests) setInterests(draft.interests);
      if (draft.sexual_orientation) setSexualOrientation(draft.sexual_orientation);
      if (draft.religion) setReligion(draft.religion);
      if (!draft.full_name || profileMatchesSession(draft.full_name, sessionName)) {
        const urls = profileImageUrlsFromDraft(draft);
        applyProfilePhotos(urls);
        setLocalOnlyNotice(
          "Showing changes saved on this device. The server has not accepted profile edits yet."
        );
        return Boolean(draft.gender) && urls.some(Boolean);
      }
    }

    const cache = getLoginProfileCache();
    if (!cache) return false;
    if (sessionName && cache.full_name && !profileMatchesSession(cache.full_name, sessionName)) {
      clearLoginProfileCache();
      clearStoredHashedUserId();
      return false;
    }
    if (cache.full_name) setName((prev) => prev || cache.full_name || "");
    if (cache.gender) {
      const g = cache.gender.toLowerCase();
      setGender((prev) => prev || g || "");
    }
    const urls = profileImageUrlsFromCache(cache);
    applyProfilePhotos(urls);
    return Boolean(cache.gender) && urls.some(Boolean);
  }, []);

  async function photoUrlsForSave(
    slots: ProfilePhotoSlot[]
  ): Promise<[string | null, string | null, string | null]> {
    const urls: (string | null)[] = [];
    for (const slot of slots) {
      if (slot.removed) {
        urls.push(null);
        continue;
      }
      if (slot.preview) {
        urls.push(slot.preview);
        continue;
      }
      urls.push(slot.url);
    }
    return urls as [string | null, string | null, string | null];
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/sign-in");
      return;
    }

    const user = getUser();
    if (user) {
      setName(user.fullName ?? "");
      setPhone(user.phone ?? "");
      setDateOfBirth(user.dateOfBirth ?? "");
    }

    const hasEssentialsFromCache = applyLoginCacheFallback();

    (async () => {
      const result = await fetchMyProfile();
      if (result.profile) {
        const p = result.profile;
        const sessionName = (getUser()?.fullName ?? "").trim();
        if (sessionName && !profileMatchesSession(p.name, sessionName)) {
          clearLoginProfileCache();
          clearStoredHashedUserId();
          applyProfilePhotos([null, null, null]);
          setName(sessionName);
          setNotice("We couldn't verify your profile photos. Please upload them again.");
        } else {
          const displayName = (p.name || sessionName).trim();
          if (displayName) setName(displayName);
          if (p.gender) setGender(p.gender.toLowerCase());
          if (p.about_me) setAboutMe(p.about_me);
          if (p.location) setLocation(p.location);
          if (p.interests) setInterests(p.interests);
          if (p.sexual_orientation) setSexualOrientation(p.sexual_orientation);
          if (p.religion) setReligion(p.religion);
          applyProfilePhotos([p.profile_image, p.image1 ?? null, p.image2 ?? null]);
          storeLoginProfileCache({
            profile_image: p.profile_image,
            image1: p.image1 ?? null,
            image2: p.image2 ?? null,
            gender: p.gender,
            full_name: displayName || p.name,
          });
          if (p.date_of_birth > 0 && p.date_of_birth < 120) {
            setProfileAge(p.date_of_birth);
          }
          if (!p.profile_image && !p.image1) {
            setNotice(
              "We loaded your account, but photos were missing from this session. Sign out and sign back in to refresh them, or upload below."
            );
          }
        }
      } else if (result.error && !hasEssentialsFromCache) {
        setNotice(result.error);
      }
      setLoading(false);
    })();
  }, [router, applyLoginCacheFallback]);

  async function blobForSlot(slot: ProfilePhotoSlot): Promise<Blob | null> {
    if (slot.removed) return null;
    if (slot.pendingBlob) return slot.pendingBlob;
    if (slot.url) return fetchMediaBlob(slot.url);
    return null;
  }

  function slotHasPhoto(slot: ProfilePhotoSlot): boolean {
    return !slot.removed && !!(slot.preview || slot.url || slot.pendingBlob);
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    setLocalOnlyNotice("");
    if (!gender) return setError("Please select your gender.");

    setSaving(true);
    try {
      const mainBlob = await blobForSlot(photos[0]);
      if (!mainBlob) {
        setError("Add a main profile photo before saving.");
        return;
      }

      const image1Blob = await blobForSlot(photos[1]);
      const image2Blob = await blobForSlot(photos[2]);
      const photoUrls = await photoUrlsForSave(photos);

      const result = await saveAccountProfile({
        sexual_orientation: sexualOrientation || "Straight",
        gender,
        interests: interests.trim() || "General",
        about_me: aboutMe.trim() || "Hello!",
        location: location.trim() || "Nigeria",
        show_location: true,
        profile_image: mainBlob,
        image1: image1Blob,
        image2: image2Blob,
        religion: religion ?? undefined,
        fullName: undefined,
        photoUrls,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.localOnly) {
        setSuccess("Saved on this device.");
        setLocalOnlyNotice(
          "The server is not accepting profile edits for completed accounts yet. Your changes are kept here and will need a backend update to go live on Discover."
        );
        return;
      }

      setSuccess("Profile updated successfully.");
      const refreshed = await fetchMyProfile();
      if (refreshed.profile) {
        const p = refreshed.profile;
        if (p.gender) setGender(p.gender.toLowerCase());
        
        clearMediaCache(p.profile_image);
        clearMediaCache(p.image1);
        clearMediaCache(p.image2);

        const ts = Date.now();
        const addTs = (url: string | null) => (url ? `${url.split("?")[0]}?t=${ts}` : null);
        
        const mainPhoto = addTs(p.profile_image);
        const image1 = addTs(p.image1 ?? null);
        const image2 = addTs(p.image2 ?? null);

        applyProfilePhotos([mainPhoto, image1, image2]);
        storeLoginProfileCache({
          profile_image: mainPhoto,
          image1: image1,
          image2: image2,
          gender: p.gender,
          full_name: p.name,
        });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    clearSession();
    router.replace("/sign-in");
  }

  return (
    <div className="mobile-shell flex flex-col min-h-dvh bg-white">
      <LogoHeader
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-border transition-colors"
              aria-label="Settings"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="#12151C" strokeWidth="2"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="#12151C" strokeWidth="2"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-bold text-red-600 px-2.5 py-2 rounded-full hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pt-header pb-bottom-nav px-5">
        {loading ? (
          <div className="pt-6 space-y-4">
            <div className="h-6 w-40 rounded-full bg-[#F5F5F5] animate-pulse" />
            <div className="grid grid-cols-3 gap-2.5">
              <div className="aspect-[3/4] rounded-2xl bg-[#F5F5F5] animate-pulse" />
              <div className="aspect-[3/4] rounded-2xl bg-[#F5F5F5] animate-pulse" />
              <div className="aspect-[3/4] rounded-2xl bg-[#F5F5F5] animate-pulse" />
            </div>
            <div className="w-full h-14 rounded-2xl bg-[#F5F5F5] animate-pulse" />
            <div className="w-full h-14 rounded-2xl bg-[#F5F5F5] animate-pulse" />
            <div className="w-full h-14 rounded-2xl bg-[#F5F5F5] animate-pulse" />
          </div>
        ) : (
          <>
            <div className="pt-5 pb-1">
              <h1 className="text-2xl font-bold text-dark">My Profile</h1>
              <p className="text-sm text-muted mt-0.5">
                Update photos and About Me — other details are view only
              </p>
            </div>

            <div className="mt-5">
              <ProfilePhotoEditor slots={photos} onChange={setPhotos} />
            </div>

            {notice && (
              <div className="mt-5">
                <Banner tone="warning">
                  {notice}
                  {!photos.some(slotHasPhoto) && " Add at least one photo below, then tap Save Changes."}
                </Banner>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-card border border-border/60 p-4 sm:p-5 mt-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-dark uppercase tracking-wider">
                  Personal Info
                </h2>
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">
                  View only
                </span>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 block">Name</label>
                  <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-3.5 py-3 opacity-70">
                    <FieldIcon>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <circle cx="12" cy="8" r="4" stroke="#616568" strokeWidth="2"/>
                        <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="text"
                      value={name || "—"}
                      readOnly
                      className="flex-1 bg-transparent text-sm font-semibold text-dark outline-none cursor-not-allowed"
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 block">Phone Number</label>
                  <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-3.5 py-3 opacity-70">
                    <FieldIcon>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.31 1.85.53 2.81.66A2 2 0 0 1 22 14.92z" stroke="#616568" strokeWidth="2" strokeLinejoin="round"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="tel"
                      value={phone || "—"}
                      readOnly
                      className="flex-1 bg-transparent text-sm font-semibold text-dark outline-none cursor-not-allowed"
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                {/* Birth Date */}
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 block">Birth Date</label>
                  <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-3.5 py-3 opacity-70">
                    <FieldIcon>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#616568" strokeWidth="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </FieldIcon>
                    <input
                      type="date"
                      value={dateOfBirth}
                      readOnly
                      className="flex-1 bg-transparent text-sm font-semibold text-dark outline-none cursor-not-allowed"
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {!dateOfBirth && profileAge && (
                    <p className="text-[11px] text-muted mt-1.5 ml-1">Age: {profileAge} (from profile)</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5 block">Gender</label>
                  <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-3.5 py-3 opacity-70">
                    <FieldIcon>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <circle cx="11" cy="11" r="5" stroke="#616568" strokeWidth="2"/>
                        <path d="M15.5 6.5L20 2M20 2h-4M20 2v4" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M11 16v4M9 18h4" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </FieldIcon>
                    <span className="flex-1 text-sm font-semibold text-dark cursor-not-allowed">
                      {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "—"}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted mt-4 text-center">
                Personal details are set at sign-up and cannot be changed here.
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-card border border-border/60 p-4 sm:p-5 mt-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-xs font-bold text-dark uppercase tracking-wider">
                  About Me
                </h2>
              </div>
              <div className="relative">
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value.slice(0, 300))}
                  rows={5}
                  placeholder="Tell people what makes you you…"
                  className="w-full rounded-2xl border-2 border-border bg-[#F5F5F5] px-4 py-3 text-sm font-medium text-dark placeholder-muted/60 outline-none focus:border-primary resize-none transition-colors leading-relaxed"
                />
                <span
                  className={`absolute bottom-3 right-4 text-[10px] font-medium ${
                    aboutMe.length >= 300 ? "text-primary" : "text-muted"
                  }`}
                >
                  {aboutMe.length}/300
                </span>
              </div>
              <p className="text-[11px] text-muted mt-2">
                Saved with your photos when you tap Save Changes.
              </p>
            </div>

            <div className="space-y-3 mt-5">
              {localOnlyNotice && <Banner tone="warning">{localOnlyNotice}</Banner>}
              {error && <Banner tone="error">{error}</Banner>}
              {success && <Banner tone="success">{success}</Banner>}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full mt-6 shadow-card disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </>
        )}
      </div>

      {/* Settings Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="fixed top-0 left-0 h-full w-[80%] max-w-[340px] bg-white z-50 flex flex-col shadow-2xl"
            style={{ maxWidth: "min(340px, calc(600px * 0.8))" }}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-border">
              <h2 className="text-xl font-bold text-dark">Settings</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#12151C" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {SETTINGS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#F5F5F5] transition-colors"
                >
                  <div className="w-9 h-9 rounded-2xl bg-[#EEEEFF] flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-dark">{item.label}</span>
                  {item.meta && (
                    <span className="text-xs text-muted mr-1">{item.meta}</span>
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ))}

              <div className="mx-5 border-t border-border my-2" />

              <button
                type="button"
                onClick={() => { setDrawerOpen(false); handleSignOut(); }}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 17 21 12 16 7" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="21" y1="12" x2="9" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="flex-1 text-sm font-semibold text-red-500">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
