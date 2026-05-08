"use client";
import { useState, useRef } from "react";
import Link from "next/link";

// ── Photo upload step (interactive, needs its own state) ──────────────────────
function PhotoStep() {
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const pickPhoto = (i: number) => inputRefs[i].current?.click();

  const onFileChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotos((prev) => {
        const next = [...prev];
        next[i] = ev.target?.result as string;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const PhotoCard = ({ index, className }: { index: number; className?: string }) => (
    <div
      onClick={() => pickPhoto(index)}
      className={`relative rounded-2xl overflow-hidden cursor-pointer flex flex-col items-center justify-center transition-all ${
        photos[index]
          ? "border-0"
          : "border-2 border-dashed border-primary bg-primary-light"
      } ${className ?? ""}`}
    >
      {photos[index] ? (
        <>
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
    <div className="grid grid-cols-2 gap-3" style={{ height: 340 }}>
      {/* Big card — left, spans full height */}
      <PhotoCard index={0} className="h-full" />
      {/* Two stacked cards — right */}
      <div className="flex flex-col gap-3 h-full">
        <PhotoCard index={1} className="flex-1" />
        <PhotoCard index={2} className="flex-1" />
      </div>
    </div>
  );
}

// ── Bio step ──────────────────────────────────────────────────────────────────
function BioStep() {
  const [bio, setBio] = useState("");
  const max = 300;
  return (
    <div>
      <div className="relative">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, max))}
          rows={6}
          placeholder="e.g. Coffee lover, adventure seeker, sunset chaser. Looking for someone who makes me laugh and keeps life interesting…"
          className="w-full rounded-3xl border-2 border-border bg-border px-5 py-4 text-base font-medium text-dark placeholder-muted/60 outline-none focus:border-primary resize-none transition-colors leading-relaxed"
        />
        <span className={`absolute bottom-4 right-5 text-xs font-medium ${bio.length >= max ? "text-primary" : "text-muted"}`}>
          {bio.length}/{max}
        </span>
      </div>
      <p className="text-sm text-muted mt-3 leading-5">
        A great bio gets 3× more matches. Be yourself — write something genuine!
      </p>
    </div>
  );
}

// ── Steps config ──────────────────────────────────────────────────────────────
const steps = [
  {
    title: "My Sexual Orientation Is",
    subtitle: "Select up to 3",
    content: (
      <div className="flex flex-col gap-2">
        {["Straight", "Asexual", "Heterosexual", "Others"].map((o) => (
          <label key={o} className="flex items-center justify-between py-4 px-4 rounded-2xl border-2 border-border cursor-pointer hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary-light transition-colors">
            <span className="text-base font-semibold text-dark">{o}</span>
            <input type="checkbox" name="orientation" value={o} className="accent-primary w-4 h-4" />
          </label>
        ))}
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input type="checkbox" className="accent-primary w-4 h-4" />
          <span className="text-sm text-muted">Show my orientation on my profile</span>
        </label>
      </div>
    ),
    btnLabel: "Continue",
  },
  {
    title: "Show Me",
    subtitle: "You can update this info later.",
    content: (
      <div className="flex flex-col gap-2">
        {["Women", "Men", "Others"].map((o, i) => (
          <label key={o} className="flex items-center justify-between py-4 px-4 rounded-2xl border-2 border-border cursor-pointer hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary-light transition-colors">
            <span className="text-base font-semibold text-dark">{o}</span>
            <input type="radio" name="show-me" value={o} defaultChecked={i === 0} className="accent-primary w-4 h-4" />
          </label>
        ))}
      </div>
    ),
    btnLabel: "Continue",
  },
  {
    title: "My Interests",
    subtitle: "Let everyone know what you're passionate about.",
    content: (
      <div className="flex flex-wrap gap-2.5">
        {[
          "Hiking","Travel","Photography","Cooking","Reading","Gaming","Yoga","Meditation","Dancing","Painting",
          "Gym","Cycling","Running","Swimming","Surfing","Skiing","Snowboarding","Rock Climbing","Martial Arts","Boxing",
          "Football","Basketball","Tennis","Golf","Volleyball","Baseball","Cricket","Rugby","Badminton","Table Tennis",
          "Music","Guitar","Piano","Drums","Singing","DJ","Podcasts","Concerts","Theatre","Broadway",
          "Movies","Anime","Comics","NFTs","Crypto","Technology","Coding","Design","Architecture","Fashion",
          "Makeup","Skincare","Fitness","Bodybuilding","Pilates","CrossFit","Zumba","Skateboarding","BMX","Motorcycles",
          "Cars","Foodie","Wine","Coffee","Tea","Baking","Veganism","Astrology","Spirituality","Volunteering",
          "Entrepreneurship","Investing","Politics","History","Science","Nature","Camping","Fishing","Hunting","Birds",
          "Pets","Dogs","Cats","Art","Sculpture","Writing","Poetry","Blogging","Languages","Board Games","Chess",
        ].map((interest) => (
          <label key={interest} className="cursor-pointer">
            <input type="checkbox" name="interests" value={interest} className="sr-only peer" />
            <span className="inline-block px-4 py-2 rounded-full border-2 border-border text-sm font-semibold text-dark peer-checked:border-primary peer-checked:bg-primary-light peer-checked:text-primary transition-colors">
              {interest}
            </span>
          </label>
        ))}
      </div>
    ),
    btnLabel: "Continue",
  },
  {
    title: "Add Your Photos",
    subtitle: "Add up to 3 photos. Your first photo is your main profile picture.",
    content: <PhotoStep />,
    btnLabel: "Continue",
  },
  {
    title: "About Me",
    subtitle: "Tell people what makes you unique.",
    content: <BioStep />,
    btnLabel: "Let's Go!",
  },
];

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const stepLabels = ["Orientation", "Show Me", "Interests", "Photos", "Bio"];

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      {/* Back button — goes to previous step or uses router.back on first */}
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
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              className={`relative h-1.5 flex-1 rounded-full overflow-hidden transition-all ${
                i < step ? "cursor-pointer" : "cursor-default"
              }`}
              aria-label={`Go to step ${i + 1}`}
            >
              {/* Background track */}
              <span className="absolute inset-0 rounded-full bg-[#F0F0F0]" />
              {/* Fill */}
              <span
                className={`absolute inset-0 rounded-full transition-all duration-500 ${
                  i < step
                    ? "bg-primary"
                    : i === step
                    ? "bg-primary"
                    : "bg-transparent"
                }`}
                style={{ width: i === step ? "100%" : i < step ? "100%" : "0%" }}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm font-semibold text-dark">{stepLabels[step]}</p>
          <p className="text-xs text-muted">{step + 1} / {steps.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-4">
        <h1 className="screen-title mb-1">{current.title}</h1>
        <p className="screen-subtitle mb-6">{current.subtitle}</p>
        {current.content}
      </div>

      <div className="bottom-bar">
        {isLast ? (
          <Link href="/location" className="btn-primary">{current.btnLabel}</Link>
        ) : (
          <button onClick={() => setStep((s) => s + 1)} className="btn-primary">{current.btnLabel}</button>
        )}
      </div>
    </div>
  );
}
