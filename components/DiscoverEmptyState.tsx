import Link from "next/link";
import type { DiscoverEmptyReason } from "@/lib/letsmeet";

interface DiscoverEmptyStateProps {
  reason: DiscoverEmptyReason;
  platformUserCount?: number;
  onRefresh: () => void;
}

export default function DiscoverEmptyState({
  reason,
  platformUserCount = 0,
  onRefresh,
}: DiscoverEmptyStateProps) {
  const count = platformUserCount;

  let title = "No profiles right now";
  let description =
    "Check back later for new people, or invite friends to grow the community.";

  if (reason === "incomplete_profile") { 
    title = "Finish your profile";
    description =
      "Your profile isn't live on Discover yet. Complete setup so others can find you and you can start matching.";
  } else if (reason === "empty_pool") {
    title =
      count === 0
        ? "You're early — no one else here yet"
        : `Only ${count} ${count === 1 ? "person" : "people"} on Discover`;
    description =
      count === 0
        ? "There aren't any other profiles on LetsMeet right now. Invite a friend to sign up and match with you."
        : "The discover pool is very small. Invite friends to get more people to match with.";
  } else if (reason === "all_swiped") {
    title = "You've seen everyone nearby";
    description = `You've swiped through all ${count} ${count === 1 ? "profile" : "profiles"} available. Check Matches or invite friends for more.`;
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
      <div className="w-24 h-24 rounded-[32px] bg-white border border-primary/15 shadow-card flex items-center justify-center mb-5">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            stroke="#F759F5"
            strokeWidth="2"
          />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-dark mb-2">{title}</h3>
      <p className="text-sm text-muted mb-6 max-w-xs leading-5">{description}</p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        {reason === "incomplete_profile" ? (
          <Link href="/profile-setup" className="btn-primary text-center text-sm py-2.5">
            Complete profile
          </Link>
        ) : (
          <Link href="/settings/invite" className="btn-primary text-center text-sm py-2.5">
            Invite a friend
          </Link>
        )}

        {reason === "all_swiped" && (
          <Link href="/matches" className="btn-secondary text-center text-sm py-2.5">
            View matches
          </Link>
        )}

        {reason !== "incomplete_profile" && (
          <Link href="/filter" className="btn-secondary text-center text-sm py-2.5">
            Adjust filters
          </Link>
        )}

        <button
          type="button"
          onClick={onRefresh}
          className="text-sm font-semibold text-primary py-1"
        >
          Refresh discover
        </button>
      </div>
    </div>
  );
}
