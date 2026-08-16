"use client";
import { useState } from "react";
import { BackHeader } from "@/components/Header";

const GENERAL_FAQS = [
  {
    q: "What is LetsMeet?",
    a: "LetsMeet is a social dating platform designed to help people connect through chats and meaningful interactions. We match you with people who share your interests and values.",
  },
  {
    q: "What should I put in my bio?",
    a: "Be yourself! Write something genuine that reflects your personality, hobbies, and what you're looking for. A great bio gets 3× more matches.",
  },
  {
    q: "How do I unmatch someone?",
    a: "Open the chat, tap the ⋮ menu, and choose Unmatch. Or go to Match and tap Unmatch on their card. The match and conversation are removed for both of you.",
  },
  {
    q: "Is LetsMeet free?",
    a: "Yes! LetsMeet is free to use. You can browse profiles, match, and chat at no cost.",
  },
  {
    q: "How do I contact support for any issues?",
    a: "You can reach our support team via the Contact Us section in Settings, or email us directly at the address listed there. We're happy to help!",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="FAQs" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-8">
        <h2 className="text-base font-bold text-dark mt-4 mb-3">General</h2>
        <div className="flex flex-col gap-2">
          {GENERAL_FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <p className="text-sm font-semibold text-dark pr-3">{faq.q}</p>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                >
                  <path d="M6 9L12 15L18 9" stroke="#616568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted leading-5">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
