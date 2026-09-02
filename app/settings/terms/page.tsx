import { BackHeader } from "@/components/Header";

const SECTIONS: { title: string; body: string[]; bullets?: string[] }[] = [
  {
    title: "1. Eligibility",
    body: [
      "You must be 18 years or older to use Let’s Meet. By creating an account, you confirm that the information you provide is accurate and that you are legally permitted to use the service.",
    ],
  },
  {
    title: "2. Account Registration",
    body: [
      "Users are responsible for providing accurate information and keeping their login details confidential. Each person should maintain only one account unless otherwise permitted by Let’s Meet.",
      "You are responsible for all activities carried out through your account.",
    ],
  },
  {
    title: "3. User Profile & Content",
    body: [
      "Users may create profiles, upload photos, and provide personal information. You are responsible for ensuring that your content is truthful, respectful, and does not violate another person's rights.",
      "Let’s Meet may remove content or suspend accounts that violate these Terms.",
    ],
  },
  {
    title: "4. Acceptable Use",
    body: ["Users must not use Let’s Meet to:"],
    bullets: [
      "Harass, threaten, abuse, or intimidate others.",
      "Impersonate another person.",
      "Post fraudulent, offensive, sexually explicit, or illegal content.",
      "Scam, defraud, or request money from other users.",
      "Promote illegal activities.",
      "Collect or misuse another user's personal information.",
      "Use the platform for spam, advertising, or unauthorized commercial activities.",
    ],
  },
  {
    title: "5. Messaging & Communication",
    body: [
      "Let’s Meet provides messaging and communication features to help users interact. Users are responsible for their conversations and interactions.",
      "Do not share sensitive information, passwords, financial details, or send money to people you meet on the platform.",
    ],
  },
  {
    title: "6. Safety & User Responsibility",
    body: [
      "Let’s Meet does not guarantee that users are who they claim to be or that interactions will always be safe.",
      "Users should exercise caution when communicating or meeting someone they met through the platform. Report suspicious, abusive, fraudulent, or inappropriate behaviour to Let’s Meet.",
    ],
  },
  {
    title: "7. Payments & Subscriptions",
    body: [
      "Where applicable, Let’s Meet may offer paid subscriptions, premium features, or other services. Prices and applicable charges will be displayed before payment.",
      "Payments made for digital services may be subject to the applicable refund and cancellation policy.",
    ],
  },
  {
    title: "8. USSD Service",
    body: [
      "Where Let’s Meet is accessed through USSD, network availability, mobile operator charges, and service interruptions may affect the experience.",
      "Users are responsible for applicable network or USSD charges imposed by their telecommunications provider.",
    ],
  },
  {
    title: "9. Privacy",
    body: [
      "Let’s Meet may collect and process personal information required to provide and improve its services. Your information will be handled in accordance with the Let’s Meet Privacy Policy and applicable data-protection laws.",
    ],
  },
  {
    title: "10. Account Suspension & Termination",
    body: [
      "Let’s Meet may suspend, restrict, or terminate an account where a user violates these Terms, engages in fraudulent or harmful activities, or creates a risk to other users or the platform.",
      "Users may also choose to deactivate or delete their account in accordance with the available account-management options.",
    ],
  },
  {
    title: "11. Disclaimer",
    body: [
      "Let’s Meet provides a platform for people to connect but does not guarantee relationships, matches, communications, or outcomes between users.",
      "Let’s Meet is not responsible for actions, statements, transactions, or offline interactions between users.",
    ],
  },
  {
    title: "12. Changes to These Terms",
    body: [
      "Let’s Meet may update these Terms & Conditions from time to time. Updated terms will be communicated through the platform where appropriate. Continued use of the service after changes means you accept the updated Terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Terms & Conditions" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-10 overflow-y-auto">
        <h1 className="text-xl font-bold text-dark mt-2">Let’s Meet – Terms &amp; Conditions</h1>
        <p className="text-sm text-muted leading-6 mt-3">
          Welcome to Let’s Meet, a dating and social connection platform that
          allows users to create profiles, discover potential matches,
          communicate, and connect with other users through web, mobile, and
          USSD services.
        </p>
        <p className="text-sm text-dark font-semibold leading-6 mt-3">
          By registering or using Let’s Meet, you agree to these Terms &amp;
          Conditions.
        </p>

        <div className="flex flex-col gap-4 mt-6">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="bg-white rounded-2xl border border-border p-4 shadow-sm"
            >
              <h2 className="text-sm font-bold text-dark mb-2">{section.title}</h2>
              {section.body.map((p) => (
                <p key={p.slice(0, 48)} className="text-sm text-muted leading-6 mb-2 last:mb-0">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-2 flex flex-col gap-1.5 list-disc pl-5">
                  {section.bullets.map((item) => (
                    <li key={item} className="text-sm text-muted leading-5">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="text-sm text-dark font-semibold leading-6 mt-6">
          By using Let’s Meet, you confirm that you have read, understood, and
          agreed to these Terms &amp; Conditions.
        </p>
      </div>
    </div>
  );
}
