"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveDraft, compressImage } from "@/lib/profileDraft";

const ORIENTATIONS = ["Straight", "Asexual", "Heterosexual", "Bisexual", "Others"];
const SHOW_ME = ["Women", "Men", "Others"];
const INTERESTS = [
  "Hiking","Travel","Photography","Cooking","Reading","Gaming","Yoga","Meditation","Dancing","Painting",
  "Gym","Cycling","Running","Swimming","Surfing","Skiing","Snowboarding","Rock Climbing","Martial Arts","Boxing",
  "Football","Basketball","Tennis","Golf","Volleyball","Baseball","Cricket","Rugby","Badminton","Table Tennis",
  "Music","Guitar","Piano","Drums","Singing","DJ","Podcasts","Concerts","Theatre","Broadway",
  "Movies","Anime","Comics","NFTs","Crypto","Technology","Coding","Design","Architecture","Fashion",
  "Makeup","Skincare","Fitness","Bodybuilding","Pilates","CrossFit","Zumba","Skateboarding","BMX","Motorcycles",
  "Cars","Foodie","Wine","Coffee","Tea","Baking","Veganism","Astrology","Spirituality","Volunteering",
  "Entrepreneurship","Investing","Politics","History","Science","Nature","Camping","Fishing","Hunting","Birds",
  "Pets","Dogs","Cats","Art","Sculpture","Writing","Poetry","Blogging","Languages","Board Games","Chess",
];

const STEP_LABELS = ["Orientation", "Show Me", "Interests", "Photos", "Bio"];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [orientation, setOrientation] = useState<string[]>([]);
  const [showMe, setShowMe] = useState("Women");
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const [bio, setBio] = useState("");

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const isLast = step === STEP_LABELS.length - 1;

  function toggleOrientation(o: string) {
    setOrientation((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : prev.length < 3 ? [...prev, o] : prev
    );
  }

  function toggleInterest(i: string) {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  function onFileChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const compressed = await compressImage(rawDataUrl);
      setPhotos((prev) => {
        const next = [...prev];
        next[i] = compressed;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function next() {
    if (step === 0 && orientation.length === 0) return;
    if (step === 3 && !photos[0]) return;
    if (isLast) {
      saveDraft({
        sexual_orientation: orientation.join(", "),
        show_me: showMe,
        interests,
        about_me: bio,
        photos: photos.filter((p): p is string => !!p),
      });
      router.push("/religion");
      return;
    }
    setStep((s) => s + 1);
  }

  const PhotoCard = ({ index, className }: { index: number; className?: string }) => (
    <div
      onClick={() => inputRefs[index].current?.click()}
      className={`relative rounded-2xl overflow-hidden cursor-pointer flex flex-col items-center justify-center transition-all ${
        photos[index] ? "border-0" : "border-2 border-dashed border-primary bg-primary-light"
      } ${className ?? ""}`}
    >
      {photos[index] ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[index]!} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-card z-10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#F759F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="4" stroke="#F759F5" strokeWidth="2" />
            </svg>
          </div>
        </>
      ) : (
        <>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="mb-1.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#F759F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="4" stroke="#F759F5" strokeWidth="1.5" />
          </svg>
          <span className="text-sm font-medium text-primary">Add</span>
        </>
      )}
      <input
        ref={inputRefs[index]}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFileChange(index, e)}
      />
    </div>
  );

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      {/* Back button */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-mobile px-4 py-4 z-50">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#F5F5F5] hover:bg-[#EBEBEB] transition-colors"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#12151C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="px-5 pt-20 pb-2">
        <div className="flex gap-2">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className="relative h-1.5 flex-1 rounded-full overflow-hidden">
              <span className="absolute inset-0 rounded-full bg-[#F0F0F0]" />
              <span
                className="absolute inset-0 rounded-full transition-all duration-500 bg-primary"
                style={{ width: i <= step ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm font-semibold text-dark">{STEP_LABELS[step]}</p>
          <p className="text-xs text-muted">{step + 1} / {STEP_LABELS.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-4">
        {step === 0 && (
          <>
            <h1 className="screen-title mb-1">My Sexual Orientation Is</h1>
            <p className="screen-subtitle mb-6">Select up to 3</p>
            <div className="flex flex-col gap-2">
              {ORIENTATIONS.map((o) => (
                <label
                  key={o}
                  className={`flex items-center justify-between py-4 px-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                    orientation.includes(o) ? "border-primary bg-primary-light" : "border-border hover:border-primary"
                  }`}
                >
                  <span className="text-base font-semibold text-dark">{o}</span>
                  <input
                    type="checkbox"
                    checked={orientation.includes(o)}
                    onChange={() => toggleOrientation(o)}
                    className="accent-primary w-4 h-4"
                  />
                </label>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="screen-title mb-1">Show Me</h1>
            <p className="screen-subtitle mb-6">You can update this info later.</p>
            <div className="flex flex-col gap-2">
              {SHOW_ME.map((o) => (
                <label
                  key={o}
                  className={`flex items-center justify-between py-4 px-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                    showMe === o ? "border-primary bg-primary-light" : "border-border hover:border-primary"
                  }`}
                >
                  <span className="text-base font-semibold text-dark">{o}</span>
                  <input
                    type="radio"
                    name="show-me"
                    checked={showMe === o}
                    onChange={() => setShowMe(o)}
                    className="accent-primary w-4 h-4"
                  />
                </label>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="screen-title mb-1">My Interests</h1>
            <p className="screen-subtitle mb-6">Let everyone know what you&apos;re passionate about.</p>
            <div className="flex flex-wrap gap-2.5">
              {INTERESTS.map((interest) => (
                <label key={interest} className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interests.includes(interest)}
                    onChange={() => toggleInterest(interest)}
                    className="sr-only peer"
                  />
                  <span className="inline-block px-4 py-2 rounded-full border-2 border-border text-sm font-semibold text-dark peer-checked:border-primary peer-checked:bg-primary-light peer-checked:text-primary transition-colors">
                    {interest}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="screen-title mb-1">Add Your Photos</h1>
            <p className="screen-subtitle mb-6">Add up to 3 photos. Your first photo is your main profile picture.</p>
            <div className="grid grid-cols-2 gap-3" style={{ height: 340 }}>
              <PhotoCard index={0} className="h-full" />
              <div className="flex flex-col gap-3 h-full">
                <PhotoCard index={1} className="flex-1" />
                <PhotoCard index={2} className="flex-1" />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="screen-title mb-1">About Me</h1>
            <p className="screen-subtitle mb-6">Tell people what makes you unique.</p>
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 300))}
                rows={6}
                placeholder="e.g. Coffee lover, adventure seeker, sunset chaser. Looking for someone who makes me laugh and keeps life interesting…"
                className="w-full rounded-3xl border-2 border-border bg-border px-5 py-4 text-base font-medium text-dark placeholder-muted/60 outline-none focus:border-primary resize-none transition-colors leading-relaxed"
              />
              <span className={`absolute bottom-4 right-5 text-xs font-medium ${bio.length >= 300 ? "text-primary" : "text-muted"}`}>
                {bio.length}/300
              </span>
            </div>
            <p className="text-sm text-muted mt-3 leading-5">
              A great bio gets 3× more matches. Be yourself — write something genuine!
            </p>
          </>
        )}
      </div>

      <div className="bottom-bar">
        <button
          onClick={next}
          disabled={(step === 0 && orientation.length === 0) || (step === 3 && !photos[0])}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLast ? "Let's Go!" : "Continue"}
        </button>
      </div>
    </div>
  );
}
