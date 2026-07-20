import { redirect } from "next/navigation";
import { ClubHub } from "@/components/club-hub/ClubHub";
import { getDummyClubSnapshot } from "@/lib/dev/dummyClub";

// Reads live club balances from the DB — never prerender.
export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const club = await getDummyClubSnapshot();

  // No club yet → send the player through the FTUE.
  if (!club) redirect("/onboarding");

  return <ClubHub initialClub={club} />;
}
