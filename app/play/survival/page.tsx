import { redirect } from "next/navigation";
import { SurvivalMatch } from "@/components/survival/SurvivalMatch";
import { SurvivalCategoryPicker } from "@/components/survival/SurvivalCategoryPicker";
import { ExhaustedBlocker } from "@/components/quiz/ExhaustedBlocker";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import {
  drawSurvivalBatch,
  listSurvivalCategories,
} from "@/actions/match/drawSurvivalBatch";
import { prisma } from "@/lib/prisma";
import { SURVIVAL_MIN_CATEGORY_QUESTIONS } from "@/lib/game/survival";

export const dynamic = "force-dynamic";

export default async function SurvivalPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categoryId } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.club) redirect("/onboarding");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  if (club.stamina <= 0) {
    return <ExhaustedBlocker />;
  }

  const listed = await listSurvivalCategories();
  if (!listed.ok) redirect("/login");

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

  if (!categoryId) {
    return (
      <SurvivalCategoryPicker
        categories={listed.categories}
        records={records}
      />
    );
  }

  const category = listed.categories.find((c) => c.id === categoryId);
  if (!category || category.questionCount < SURVIVAL_MIN_CATEGORY_QUESTIONS) {
    return (
      <SurvivalCategoryPicker
        categories={listed.categories}
        records={records}
      />
    );
  }

  const batch = await drawSurvivalBatch({
    categoryId,
    seenQuestionIds: [],
  });

  if (!batch.ok || batch.questions.length === 0) {
    return (
      <SurvivalCategoryPicker
        categories={listed.categories}
        records={records}
      />
    );
  }

  return (
    <SurvivalMatch category={category} initialQuestions={batch.questions} />
  );
}
