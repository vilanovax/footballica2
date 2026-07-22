import { redirect } from "next/navigation";
import { PlayerProfile } from "@/components/profile/PlayerProfile";
import { getCurrentUser, getProfileSnapshot } from "@/lib/player/current";
import { getMyMissions } from "@/actions/missions";

// Reads live user XP + club stats + unlocked badges — never prerender.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfileSnapshot();
  if (!profile) redirect("/onboarding");

  const missions = await getMyMissions();
  const missionBoard = missions.ok ? missions.board : null;
  const dailyBoard = missions.ok ? missions.daily : null;

  return (
    <PlayerProfile
      profile={profile}
      missionBoard={missionBoard}
      dailyBoard={dailyBoard}
    />
  );
}
