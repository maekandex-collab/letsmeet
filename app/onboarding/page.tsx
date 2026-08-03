import { redirect } from "next/navigation";

/** Legacy route — welcome experience now lives at `/splash` as a carousel. */
export default function OnboardingPage() {
  redirect("/splash");
}
