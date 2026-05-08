import Link from "next/link";
import { BackHeader } from "@/components/Header";

export default function NotificationPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-32 text-center">
        <div className="w-28 h-28 rounded-3xl bg-primary-light flex items-center justify-center mb-8">
          <span className="text-6xl">🔔</span>
        </div>
        <h1 className="screen-title mb-3">Enable Notifications</h1>
        <p className="text-base text-muted leading-6 max-w-xs">
          Stay notified about new matches, messages, and other exciting updates on LetsMeet.
        </p>
      </div>

      <div className="bottom-bar flex-col gap-3">
        <Link href="/create-pin" className="btn-primary">
          Allow Notifications
        </Link>
        <Link href="/create-pin" className="btn-secondary">
          Skip, I&apos;ll confirm later
        </Link>
      </div>
    </div>
  );
}
