import { BackHeader } from "@/components/Header";

const faqs = [
  { q: "How do I get matches?", a: "Complete your profile with great photos and a bio. Keep swiping and liking profiles you're interested in!" },
  { q: "How do I change my location?", a: "Go to your profile settings and update your location. You can set a radius to find matches near you." },
  { q: "How do I report someone?", a: "Tap the three-dot menu on any profile and select 'Report'. We take all reports seriously." },
  { q: "Can I hide my profile?", a: "Yes! Go to Account > Security and toggle your profile visibility off at any time." },
  { q: "How do I delete my account?", a: "Go to Account > Delete / Deactivate Account. Note that deletion is permanent." },
];

export default function FaqPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="FAQ" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <div className="flex flex-col gap-3 mt-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <p className="text-sm font-bold text-dark mb-2">{faq.q}</p>
              <p className="text-sm text-muted leading-5">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
