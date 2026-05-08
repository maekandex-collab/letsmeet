import { BackHeader } from "@/components/Header";
import Link from "next/link";

export default function DeletePage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Delete / Deactivate" backHref="/account" />
      <div className="flex-1 flex flex-col px-5 pt-20 pb-28">
        <div className="flex flex-col items-center text-center pt-8 mb-8">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">Delete Your Account?</h2>
          <p className="text-sm text-muted leading-5 max-w-xs">
            This action is permanent. All your matches, messages, and profile data will be deleted and cannot be recovered.
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="p-4 rounded-2xl border-2 border-border bg-white">
            <p className="text-base font-bold text-dark mb-1">Deactivate Account</p>
            <p className="text-sm text-muted leading-5">Hide your profile temporarily. You can reactivate anytime by logging back in.</p>
            <button className="mt-3 px-5 py-2.5 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary-light transition-colors">
              Deactivate
            </button>
          </div>
          <div className="p-4 rounded-2xl border-2 border-red-100 bg-red-50">
            <p className="text-base font-bold text-red-500 mb-1">Delete Account</p>
            <p className="text-sm text-muted leading-5">Permanently delete your account and all associated data. This cannot be undone.</p>
            <button className="mt-3 px-5 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors">
              Delete Permanently
            </button>
          </div>
        </div>

        <Link href="/account" className="text-center text-sm font-semibold text-primary">
          Cancel, keep my account
        </Link>
      </div>
    </div>
  );
}
