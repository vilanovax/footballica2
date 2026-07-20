import { redirect } from "next/navigation";
import { PenaltyMatch } from "@/components/quiz/PenaltyMatch";
import { ExhaustedBlocker } from "@/components/quiz/ExhaustedBlocker";
import { getDummyClubSnapshot } from "@/lib/dev/dummyClub";

// Reads live (regenerated) stamina before allowing a match — never prerender.
export const dynamic = "force-dynamic";

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

  return <PenaltyMatch tutorial={isTutorial} />;
}
