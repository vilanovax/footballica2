import { redirect } from "next/navigation";
import { PenaltyMatch } from "@/components/quiz/PenaltyMatch";
import { ExhaustedBlocker } from "@/components/quiz/ExhaustedBlocker";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import { getMatchQuestions } from "@/actions/getMatchQuestions";
import { getGameConfig } from "@/lib/game/gameConfig";

// Reads live (regenerated) stamina before allowing a match — never prerender.
export const dynamic = "force-dynamic";

export default async function PenaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ tutorial?: string }>;
}) {
  const { tutorial } = await searchParams;
  const isTutorial = tutorial === "true";

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  // Gate: block entry when exhausted — but the FTUE tutorial is stamina-free.
  if (!isTutorial && club.stamina <= 0) {
    return <ExhaustedBlocker />;
  }

  // Match size is Live-Ops tunable (full shootout vs. shorter easy-only tutorial).
  const config = await getGameConfig();
  const matchSize = isTutorial
    ? config.match.tutorialQuestionCount
    : config.match.questionCount;

  // A few spare questions back the "Substitution" helper (tutorial has none).
  const benchSize = isTutorial ? 0 : 3;

  // Draw the authoritative question set server-side from the DB (+ bench).
  const drawn = await getMatchQuestions(
    isTutorial
      ? { count: matchSize, difficulties: ["easy"] }
      : { count: matchSize + benchSize },
  );
  const initialQuestions = drawn.slice(0, matchSize);
  const bench = drawn.slice(matchSize);

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
    <PenaltyMatch
      tutorial={isTutorial}
      initialQuestions={initialQuestions}
      bench={bench}
      matchSize={matchSize}
      startingCoins={club.coins}
      helpers={config.helpers}
    />
  );
}
