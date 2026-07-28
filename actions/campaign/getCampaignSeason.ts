"use server";

import { listRecordChallenges } from "@/actions/challenge/recordChallenge";
import { getMyMissions } from "@/actions/missions";
import {
  buildCampaignSeasonView,
  type CampaignSeasonView,
} from "@/lib/game/campaignSeason";

export type GetCampaignSeasonResult =
  | { ok: true; season: CampaignSeasonView }
  | { ok: false; error: "not_authenticated" | "server_error" };

/**
 * Hub Campaign snapshot — CAMPAIGN mission batch + live RecordChallenge chapters.
 */
export async function getCampaignSeason(): Promise<GetCampaignSeasonResult> {
  try {
    const [missions, challenges] = await Promise.all([
      getMyMissions(),
      listRecordChallenges(),
    ]);
    if (!missions.ok) {
      return {
        ok: false,
        error:
          missions.error === "not_authenticated"
            ? "not_authenticated"
            : "server_error",
      };
    }

    const chapters =
      challenges.ok
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
        : [];

    return {
      ok: true,
      season: buildCampaignSeasonView({
        board: missions.board,
        chapters,
      }),
    };
  } catch (err) {
    console.error("[getCampaignSeason]", err);
    return { ok: false, error: "server_error" };
  }
}
