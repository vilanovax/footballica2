import { redirect } from "next/navigation";
import { QuickMatch } from "@/components/quiz/QuickMatch";
import { ExhaustedBlocker } from "@/components/quiz/ExhaustedBlocker";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import { getMatchQuestions } from "@/actions/getMatchQuestions";
import { getGameConfig } from "@/lib/game/gameConfig";

// Reads live (regenerated) stamina before allowing a match — never prerender.
export const dynamic = "force-dynamic";

export default async function QuickPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  // Gate: block entry when exhausted (Quick Match spends stamina like Penalty).
  if (club.stamina <= 0) {
    return <ExhaustedBlocker />;
  }

  // Rapid-fire length is Live-Ops tunable (PRD §4C: 5–10 questions).
  const config = await getGameConfig();
  const matchSize = config.match.quickQuestionCount;
  const benchSize = 3;

  // Draw the authoritative question set server-side from the DB (+ bench for Substitution).
  const drawn = await getMatchQuestions({ count: matchSize + benchSize });
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
    <QuickMatch
      initialQuestions={initialQuestions}
      bench={bench}
      matchSize={matchSize}
      startingCoins={club.coins}
      helpers={config.helpers}
    />
  );
}
