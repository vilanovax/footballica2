import { ClubHub } from "@/components/club-hub/ClubHub";
import { getDummyClubSnapshot } from "@/lib/dev/dummyClub";
import type { ClubSnapshot } from "@/lib/club/upgrades";

// Reads live club balances from the DB — never prerender.
export const dynamic = "force-dynamic";

const STARTER_CLUB: ClubSnapshot = {
  coins: 0,
  fans: 0,
  stamina: 3,
  maxStamina: 3,
  stadiumLevel: 0,
  medicalLevel: 0,
  trainingGroundLevel: 0,
};

export default async function ClubPage() {
  const club = await getDummyClubSnapshot();
  return <ClubHub initialClub={club ?? STARTER_CLUB} />;
}
