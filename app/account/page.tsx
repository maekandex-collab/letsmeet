"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ProfilePhoto from "@/components/ProfilePhoto";
import {
  getUser,
  clearSession,
  isLoggedIn,
  fetchMyProfile,
  uploadProfile,
  fetchMediaBlob,
  extractError,
  updateUser,
  prefetchMedia,
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

export default function AccountPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);

  const [aboutMe, setAboutMe] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [religion, setReligion] = useState<string | null>(null);
  const [profileAge, setProfileAge] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");

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

    (async () => {
      const result = await fetchMyProfile();
      if (result.profile) {
        const p = result.profile;
        if (p.name) setName(p.name);
        if (p.gender) setGender(p.gender);
        if (p.about_me) setAboutMe(p.about_me);
        if (p.location) setLocation(p.location);
        if (p.interests) setInterests(p.interests);
        if (p.sexual_orientation) setSexualOrientation(p.sexual_orientation);
        if (p.religion) setReligion(p.religion);
        if (p.profile_image) {
          setProfileImage(p.profile_image);
          prefetchMedia([p.profile_image], 1);
        }
        if (p.date_of_birth > 0 && p.date_of_birth < 120) {
          setProfileAge(p.date_of_birth);
        }
      } else if (result.error) {
        setNotice(result.error);
      }
      setLoading(false);
    })();
  }, [router]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingPhotoBlob(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    if (!gender) return setError("Please select your gender.");

    setSaving(true);
    try {
      let imageBlob = pendingPhotoBlob;
      if (!imageBlob && profileImage) {
        imageBlob = await fetchMediaBlob(profileImage);
      }
      if (!imageBlob) {
        setError("A profile photo is required to save. Tap the camera icon to add one.");
        return;
      }

      const res = await uploadProfile({
        sexual_orientation: sexualOrientation || "Straight",
        gender,
        interests: interests.trim() || "General",
        about_me: aboutMe.trim() || "Hello!",
        location: location.trim() || "Nigeria",
        show_location: true,
        profile_image: imageBlob,
        religion: religion ?? undefined,
      });

      if (res.ok || res.status === 500) {
        if (name.trim()) updateUser({ fullName: name.trim() });
        setSuccess("Profile updated successfully.");
        setPendingPhotoBlob(null);
        setPhotoPreview(null);
        const refreshed = await fetchMyProfile();
        if (refreshed.profile?.profile_image) {
          setProfileImage(refreshed.profile.profile_image);
        }
      } else {
        setError(extractError(res.data, "Could not save your profile."));
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
    <div className="mobile-shell flex flex-col min-h-screen bg-white">
      <LogoHeader
        right={
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
        }
      />

      <div className="flex-1 overflow-y-auto pt-20 pb-28 px-5">
        {loading ? (
          <div className="flex flex-col items-center pt-16 gap-4">
            <div className="w-24 h-24 rounded-full bg-[#F5F5F5] animate-pulse" />
            <div className="w-full h-12 rounded-2xl bg-[#F5F5F5] animate-pulse" />
            <div className="w-full h-12 rounded-2xl bg-[#F5F5F5] animate-pulse" />
          </div>
        ) : (
          <>
            {/* Profile photo */}
            <div className="flex flex-col items-center pt-6 pb-6">
              <div className="relative">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-card bg-primary-light">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <ProfilePhoto photo={profileImage} alt={name || "Your profile"} priority />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md border-2 border-white"
                  aria-label="Change profile photo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
                  </svg>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoChange}
                />
              </div>
            </div>

            {notice && (
              <p className="text-xs text-muted text-center mb-4 px-2">{notice}</p>
            )}

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-dark uppercase tracking-wider mb-1.5 block">Name</label>
                <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-4 py-3.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <circle cx="12" cy="8" r="4" stroke="#616568" strokeWidth="2"/>
                    <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="flex-1 bg-transparent text-sm font-medium text-dark placeholder:text-muted outline-none"
                  />
                </div>
              </div>

              {/* Phone Number — read-only */}
              <div>
                <label className="text-xs font-bold text-dark uppercase tracking-wider mb-1.5 block">Phone Number</label>
                <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-4 py-3.5 opacity-60">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 9.81 19.79 19.79 0 0 1 1.61 1.17 2 2 0 0 1 3.58 0H6.5a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.31 1.85.53 2.81.66A2 2 0 0 1 22 14.92z" stroke="#616568" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type="tel"
                    value={phone || "—"}
                    readOnly
                    className="flex-1 bg-transparent text-sm font-medium text-dark outline-none cursor-not-allowed"
                  />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="#616568" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-[11px] text-muted mt-1 ml-1">Phone number cannot be changed</p>
              </div>

              {/* Birth Date */}
              <div>
                <label className="text-xs font-bold text-dark uppercase tracking-wider mb-1.5 block">Birth Date</label>
                <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-4 py-3.5 opacity-60">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#616568" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="date"
                    value={dateOfBirth}
                    readOnly
                    className="flex-1 bg-transparent text-sm font-medium text-dark outline-none cursor-not-allowed"
                  />
                </div>
                {!dateOfBirth && profileAge && (
                  <p className="text-[11px] text-muted mt-1 ml-1">Age: {profileAge} (from profile)</p>
                )}
                {!dateOfBirth && !profileAge && (
                  <p className="text-[11px] text-muted mt-1 ml-1">Set at sign-up — not editable here</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-bold text-dark uppercase tracking-wider mb-1.5 block">Gender</label>
                <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-2xl px-4 py-3.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <circle cx="11" cy="11" r="5" stroke="#616568" strokeWidth="2"/>
                    <path d="M15.5 6.5L20 2M20 2h-4M20 2v4" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M11 16v4M9 18h4" stroke="#616568" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-medium text-dark outline-none appearance-none"
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M6 9l6 6 6-6" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
            {success && <p className="text-sm text-green-600 mt-4">{success}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full mt-8 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {/* Sign out — visible on main screen */}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full mt-4 py-3.5 px-8 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 font-bold text-base flex items-center justify-center gap-2 transition-colors hover:bg-red-100 active:bg-red-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Sign Out
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
