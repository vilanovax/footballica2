import { redirect } from "next/navigation";
import { Shop } from "@/components/shop/Shop";
import { getClubSnapshot, getCurrentUser } from "@/lib/player/current";
import { getGameConfig } from "@/lib/game/gameConfig";

// Reads live coins/inventory + Live-Ops booster costs — never prerender.
export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const club = await getClubSnapshot();
  if (!club) redirect("/onboarding");

  const config = await getGameConfig();
  const { tab } = await searchParams;
  const initialTab =
    tab === "coins" || tab === "boosters" || tab === "upgrades"
      ? tab
      : "upgrades";

  return (
    <Shop
      initialClub={club}
      initialTab={initialTab}
      boosterCosts={{
        FIFTY_FIFTY: config.costs.boosterFiftyFifty,
        FREEZE_TIMER: config.costs.boosterFreezeTimer,
      }}
    />
  );
}
