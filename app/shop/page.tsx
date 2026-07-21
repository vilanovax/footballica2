import { redirect } from "next/navigation";
import { Shop } from "@/components/shop/Shop";
import { getDummyClubSnapshot } from "@/lib/dev/dummyClub";
import { getGameConfig } from "@/lib/game/gameConfig";

// Reads live coins/inventory + Live-Ops booster costs — never prerender.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const club = await getDummyClubSnapshot();

  // No club yet → send the player through the FTUE first.
  if (!club) redirect("/onboarding");

  const config = await getGameConfig();

  return (
    <Shop
      initialClub={club}
      boosterCosts={{
        FIFTY_FIFTY: config.costs.boosterFiftyFifty,
        FREEZE_TIMER: config.costs.boosterFreezeTimer,
      }}
    />
  );
}
