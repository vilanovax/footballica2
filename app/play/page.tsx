import { redirect } from "next/navigation";
import { getClubSnapshot, getCurrentUser, hasClub } from "@/lib/player/current";
import { getMyDuels } from "@/actions/duel/getMyDuels";
import { getDuelInbox } from "@/actions/duel/getInboxCount";
import { getGameConfig } from "@/lib/game/gameConfig";
import { getPlayModeEconomy } from "@/lib/play/modeEconomy";
import { listRecordChallenges } from "@/actions/challenge/recordChallenge";
import { getDailyMystery } from "@/actions/mystery/getDailyMystery";
import { getDailyGrid } from "@/actions/grid/getDailyGrid";
import { prisma } from "@/lib/prisma";
import { PlayModes } from "@/components/play/PlayModes";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasClub())) redirect("/onboarding");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  const [res, inbox, config, bestAgg, challengeRes, mysteryRes, gridRes] =
    await Promise.all([
      getMyDuels(),
      getDuelInbox(),
      getGameConfig(),
      user.club
        ? prisma.categoryRecord.aggregate({
            where: { clubId: user.club.id },
            _max: { maxSurvivalScore: true },
          })
        : Promise.resolve({ _max: { maxSurvivalScore: null } }),
      listRecordChallenges(),
      getDailyMystery(),
      getDailyGrid(),
    ]);

  const recentDuels = res.ok ? res.history : [];
  const modes = getPlayModeEconomy(config);
  const survivalBest = bestAgg._max.maxSurvivalScore ?? 0;
  const liveChallengeCount = challengeRes.ok
    ? challengeRes.challenges.length
    : 0;

  return (
    <PlayModes
      recentDuels={recentDuels}
      inboxCount={inbox.ok ? inbox.count : 0}
      inboxItems={inbox.ok ? inbox.items : []}
      stamina={club.stamina}
      maxStamina={club.maxStamina}
      survivalBest={survivalBest}
      modes={modes}
      liveChallengeCount={liveChallengeCount}
      mystery={mysteryRes.ok ? mysteryRes.mystery : null}
      grid={gridRes.ok ? gridRes.grid : null}
    />
  );
}
