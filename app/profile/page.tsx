import { redirect } from "next/navigation";
import { PlayerProfile } from "@/components/profile/PlayerProfile";
import { getProfileSnapshot } from "@/lib/dev/dummyClub";

// Reads live user XP + club stats + unlocked badges — never prerender.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfileSnapshot();

  // No club yet → send the player through the FTUE first.
  if (!profile) redirect("/onboarding");

  return <PlayerProfile profile={profile} />;
}
