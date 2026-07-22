import { redirect } from "next/navigation";
import { ClubHub } from "@/components/club-hub/ClubHub";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import { getDuelInbox } from "@/actions/duel/getInboxCount";
import { getMyMissions } from "@/actions/missions";

// Reads live club balances from the DB — never prerender.
export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  const [inbox, missions] = await Promise.all([
    getDuelInbox(),
    getMyMissions(),
  ]);
  const duelInboxCount = inbox.ok ? inbox.count : 0;
  const duelInboxItems = inbox.ok ? inbox.items : [];
  const missionBoard = missions.ok ? missions.board : null;
  const dailyBoard = missions.ok ? missions.daily : null;

  return (
    <ClubHub
      initialClub={club}
      duelInboxCount={duelInboxCount}
      duelInboxItems={duelInboxItems}
      missionBoard={missionBoard}
      dailyBoard={dailyBoard}
    />
  );
}
