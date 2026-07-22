import { redirect } from "next/navigation";
import { Shop } from "@/components/shop/Shop";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import { getGameConfig } from "@/lib/game/gameConfig";

// Reads live coins/inventory + Live-Ops booster costs — never prerender.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const club = await getClubSnapshot();
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
