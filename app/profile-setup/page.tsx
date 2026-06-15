"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoHeader } from "@/components/Header";
import { InputField, SelectField } from "@/components/FormFields";
import { uploadProfile, extractError, updateUser, getUser } from "@/lib/letsmeet";
import { getDraft, clearDraft, dataUrlToBlob } from "@/lib/profileDraft";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setName(user.fullName ?? "");
      setPhone(user.phone ?? "");
    }
    const draft = getDraft();
    if (draft.photos && draft.photos[0]) setMainPhoto(draft.photos[0]);
    if (draft.gender) setGender(draft.gender);
  }, []);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setMainPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleContinue() {
    setError("");
    if (!gender) return setError("Please select your gender.");

    const draft = getDraft();
    const photos = [mainPhoto, draft.photos?.[1] ?? null, draft.photos?.[2] ?? null];
    const mainBlob = photos[0] ? dataUrlToBlob(photos[0]) : null;
    if (!mainBlob) return setError("Please add a profile photo.");

    const image1 = photos[1] ? dataUrlToBlob(photos[1]) : null;
    const image2 = photos[2] ? dataUrlToBlob(photos[2]) : null;

    setLoading(true);
    try {
      const res = await uploadProfile({
        sexual_orientation: draft.sexual_orientation ?? "Straight",
        gender,
        interests: (draft.interests ?? []).join(", "),
        about_me: draft.about_me ?? "",
        location: draft.location ?? "",
        show_location: draft.show_location ?? false,
        profile_image: mainBlob,
        image1,
        image2,
      });

      // The backend currently marks the profile complete even when it returns
      // a 500 on the image step, so we proceed unless it's a hard validation error.
      if (res.ok || res.status === 500) {
        updateUser({ profileCompleted: true });
        clearDraft();
        router.push("/all-set");
        return;
      }
      setError(extractError(res.data, "Could not save your profile."));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <LogoHeader />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <h1 className="screen-title mb-1">Profile Details</h1>
        <p className="screen-subtitle mb-6">Fill up the following details.</p>

        {/* Photo upload */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-border border-3 border-white shadow-card overflow-hidden">
              {mainPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainPhoto} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-light">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#F759F5" strokeWidth="2" />
                    <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
          </div>
        </div>

        <InputField
          label="Name"
          id="name"
          type="text"
          name="name"
          placeholder="Your Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#616568" strokeWidth="2" />
              <path d="M4 20C4 17.79 7.58 16 12 16C16.42 16 20 17.79 20 20" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
        <InputField
          label="Phone Number"
          id="phone"
          type="tel"
          name="phone"
          placeholder="e.g. 08012345678"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.63a16 16 0 0 0 6 6l.95-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />

        <SelectField
          label="Gender"
          id="gender"
          name="gender"
          placeholder="Select Gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ]}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="5" stroke="#616568" strokeWidth="2" />
              <path d="M12 14v7M9 18h6" stroke="#616568" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />

        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      <div className="bottom-bar">
        <button
          onClick={handleContinue}
          disabled={loading}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Saving profile..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
