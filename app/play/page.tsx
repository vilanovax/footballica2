import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import { getMyDuels } from "@/actions/duel/getMyDuels";
import { getDuelInbox } from "@/actions/duel/getInboxCount";
import { getGameConfig } from "@/lib/game/gameConfig";
import { getPlayModeEconomy } from "@/lib/play/modeEconomy";
import { listRecordChallenges } from "@/actions/challenge/recordChallenge";
import { prisma } from "@/lib/prisma";
import { PlayModes } from "@/components/play/PlayModes";
import { PlayGotdSection } from "@/components/play/PlayGotdSection";
import { GotdSkeleton } from "@/components/play/GotdSkeleton";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.club) redirect("/onboarding");

  // Shell data first — GotD streams in under Suspense after this paints.
  const [club, res, inbox, config, bestAgg, challengeRes] = await Promise.all([
    getClubSnapshot(),
    getMyDuels(),
    getDuelInbox(),
    getGameConfig(),
    prisma.categoryRecord.aggregate({
      where: { clubId: user.club.id },
      _max: { maxSurvivalScore: true },
    }),
    listRecordChallenges(),
  ]);
  if (!club) redirect("/onboarding");

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
      gotd={
        <Suspense fallback={<GotdSkeleton />}>
          <PlayGotdSection config={config} />
        </Suspense>
      }
    />
  );
}
