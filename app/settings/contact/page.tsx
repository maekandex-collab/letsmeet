import { BackHeader } from "@/components/Header";

export default function ContactPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Contact Us" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <div className="flex flex-col gap-4 mt-4">
          {[
            {
              label: "Email",
              value: "benedit@maekandex.com",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="#3E36ED" strokeWidth="2" />
                  <path d="M2 8L12 14L22 8" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              label: "Phone",
              value: "+1 (800) 555-0199",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" stroke="#3E36ED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-white shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#EEEEFF] flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-xs text-muted">{item.label}</p>
                <p className="text-sm font-semibold text-dark">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
