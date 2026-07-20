import { redirect } from "next/navigation";
import { PenaltyMatch } from "@/components/quiz/PenaltyMatch";
import { ExhaustedBlocker } from "@/components/quiz/ExhaustedBlocker";
import { getDummyClubSnapshot } from "@/lib/dev/dummyClub";
import { getMatchQuestions } from "@/actions/getMatchQuestions";

// Reads live (regenerated) stamina before allowing a match — never prerender.
export const dynamic = "force-dynamic";

/** Full penalty shootout size; tutorial is a shorter, easy-only set. */
const MATCH_SIZE = 5;
const TUTORIAL_SIZE = 3;

export default async function PenaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ tutorial?: string }>;
}) {
  const { tutorial } = await searchParams;
  const isTutorial = tutorial === "true";

  const club = await getDummyClubSnapshot();

  // No club yet → onboarding first.
  if (!club) redirect("/onboarding");

  // Gate: block entry when exhausted — but the FTUE tutorial is stamina-free.
  if (!isTutorial && club.stamina <= 0) {
    return <ExhaustedBlocker />;
  }

  // Draw the authoritative question set server-side from the DB.
  const initialQuestions = await getMatchQuestions(
    isTutorial
      ? { count: TUTORIAL_SIZE, difficulties: ["easy"] }
      : { count: MATCH_SIZE },
  );

  // Safety net: DB has no active questions (not seeded). Avoid a blank match.
  if (initialQuestions.length === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl" aria-hidden>
          🗒️
        </div>
        <p className="max-w-xs font-display text-lg font-bold text-muted-foreground">
          No questions available yet. Seed the question bank to play.
        </p>
      </section>
    );
  }

  return (
    <PenaltyMatch tutorial={isTutorial} initialQuestions={initialQuestions} />
  );
}
