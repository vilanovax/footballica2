import { redirect } from "next/navigation";
import { ClubHub } from "@/components/club-hub/ClubHub";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import { getDuelInbox } from "@/actions/duel/getInboxCount";
import { getMyMissions } from "@/actions/missions";
import { listRecordChallenges } from "@/actions/challenge/recordChallenge";
import { buildCampaignSeasonView } from "@/lib/game/campaignSeason";
import { getGameConfig } from "@/lib/game/gameConfig";

// Reads live club balances from the DB — never prerender.
export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  const [inbox, missions, config, challenges] = await Promise.all([
    getDuelInbox(),
    getMyMissions(),
    getGameConfig(),
    listRecordChallenges(),
  ]);
  const duelInboxCount = inbox.ok ? inbox.count : 0;
  const duelInboxItems = inbox.ok ? inbox.items : [];
  const missionBoard = missions.ok ? missions.board : null;
  const dailyBoard = missions.ok ? missions.daily : null;
  const campaignSeason = buildCampaignSeasonView({
    board: missionBoard,
    chapters: challenges.ok
      ? challenges.challenges.map((c) => ({
          id: c.id,
          slug: c.slug,
          titleEn: c.titleEn,
          titleFa: c.titleFa,
          rewardBadgeEmoji: c.rewardBadgeEmoji,
          targetScore: c.targetScore,
          unlocked: c.unlocked,
          conquered: c.conquered,
          bestScore: c.bestScore,
        }))
      : [],
  });

  return (
    <ClubHub
      initialClub={club}
      staminaRefillCost={config.costs.staminaRefill}
      coinsPerWin={config.rewards.coinsPerWin}
      duelInboxCount={duelInboxCount}
      duelInboxItems={duelInboxItems}
      missionBoard={missionBoard}
      dailyBoard={dailyBoard}
      campaignSeason={campaignSeason}
    />
  );
}
