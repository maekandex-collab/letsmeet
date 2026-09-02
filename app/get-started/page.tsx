import { redirect } from "next/navigation";

/** Old entry URL — signup is not exposed to clients; go straight to sign-in. */
export default function GetStartedPage() {
  redirect("/sign-in");
}
