import { redirect } from "next/navigation";
import { SurvivalMatch } from "@/components/survival/SurvivalMatch";
import { SurvivalCategoryPicker } from "@/components/survival/SurvivalCategoryPicker";
import { SurvivalLobby } from "@/components/survival/SurvivalLobby";
import { ExhaustedBlocker } from "@/components/quiz/ExhaustedBlocker";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import {
  drawSurvivalBatch,
  listSurvivalCategories,
} from "@/actions/match/drawSurvivalBatch";
import { startSurvival } from "@/actions/match/startSurvival";
import { listRecordChallenges } from "@/actions/challenge/recordChallenge";
import { prisma } from "@/lib/prisma";
import { SURVIVAL_MIN_CATEGORY_QUESTIONS } from "@/lib/game/survival";
import { listChallengeSurvivalCategories } from "@/lib/game/challengeCategories";
import { isRecordChallengeLive } from "@/lib/game/recordChallenge";
import type { CategoryOption } from "@/lib/quiz/categoryDraw";

export const dynamic = "force-dynamic";

export default async function SurvivalPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    challenge?: string;
    pick?: string;
  }>;
}) {
  const {
    category: categoryIdRaw,
    challenge: challengeIdRaw,
    pick: pickRaw,
  } = await searchParams;
  const challengeId =
    typeof challengeIdRaw === "string" && challengeIdRaw.trim()
      ? challengeIdRaw.trim()
      : null;
  let categoryId =
    typeof categoryIdRaw === "string" && categoryIdRaw.trim()
      ? categoryIdRaw.trim()
      : null;
  const wantClassicPick =
    pickRaw === "1" || pickRaw === "true" || pickRaw === "classic";

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.club) redirect("/onboarding");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  if (club.stamina <= 0) {
    return <ExhaustedBlocker />;
  }

  const bestAgg = await prisma.categoryRecord.aggregate({
    where: { clubId: user.club.id },
    _max: { maxSurvivalScore: true },
  });
  const survivalBest = bestAgg._max.maxSurvivalScore ?? 0;

  // Hub: no challenge, no category, not asking for classic pick.
  if (!challengeId && !categoryId && !wantClassicPick) {
    const challengeRes = await listRecordChallenges();
    return (
      <SurvivalLobby
        challenges={challengeRes.ok ? challengeRes.challenges : []}
        coins={club.coins}
        survivalBest={survivalBest}
      />
    );
  }

  // Resolve picker pool: challenge-scoped banks vs public Survival.
  let pickerCategories: CategoryOption[] = [];
  if (challengeId) {
    const challenge = await prisma.recordChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge || !isRecordChallengeLive(challenge)) {
      redirect("/play/survival");
    }
    const access = await prisma.clubChallengeAccess.findUnique({
      where: {
        clubId_challengeId: {
          clubId: user.club.id,
          challengeId,
        },
      },
    });
    if (!access) redirect("/play/survival");

    pickerCategories = await listChallengeSurvivalCategories(challengeId);
  } else {
    const listed = await listSurvivalCategories();
    if (!listed.ok) redirect("/login");
    pickerCategories = listed.categories;
  }

  // Personal bests for the picker.
  const recordsRows = await prisma.categoryRecord.findMany({
    where: { clubId: user.club.id },
    select: { categoryId: true, maxSurvivalScore: true },
  });
  const records: Record<string, number> = Object.fromEntries(
    recordsRows.map((r: { categoryId: string; maxSurvivalScore: number }) => [
      r.categoryId,
      r.maxSurvivalScore,
    ]),
  );

  // Auto-skip when exactly one eligible bank (e.g. locked challenge).
  if (!categoryId && pickerCategories.length === 1) {
    categoryId = pickerCategories[0]!.id;
  }

  if (!categoryId) {
    return (
      <SurvivalCategoryPicker
        categories={pickerCategories}
        records={records}
        challengeId={challengeId}
      />
    );
  }

  const category = pickerCategories.find((c) => c.id === categoryId);
  if (!category || category.questionCount < SURVIVAL_MIN_CATEGORY_QUESTIONS) {
    return (
      <SurvivalCategoryPicker
        categories={pickerCategories}
        records={records}
        challengeId={challengeId}
      />
    );
  }

  // Gate stamina + premium unlock (stamina spent on settle, not here).
  const kickoff = await startSurvival({
    categoryId,
    challengeId,
  });
  if (!kickoff.ok) {
    if (kickoff.error === "not_enough_stamina") {
      return <ExhaustedBlocker />;
    }
    if (challengeId) redirect("/play/survival");
    return (
      <SurvivalCategoryPicker
        categories={pickerCategories}
        records={records}
        challengeId={challengeId}
      />
    );
  }

  const batch = await drawSurvivalBatch({
    categoryId,
    seenQuestionIds: [],
    challengeId,
  });

  if (!batch.ok || batch.questions.length === 0) {
    return (
      <SurvivalCategoryPicker
        categories={pickerCategories}
        records={records}
        challengeId={challengeId}
      />
    );
  }

  return (
    <SurvivalMatch
      category={category}
      initialQuestions={batch.questions}
      challengeId={challengeId}
    />
  );
}
