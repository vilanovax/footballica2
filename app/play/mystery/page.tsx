import { redirect } from "next/navigation";
import { hasClub } from "@/lib/player/current";
import { getDailyMystery } from "@/actions/mystery/getDailyMystery";
import { MysteryArena } from "@/components/mystery/MysteryArena";

export const dynamic = "force-dynamic";

export default async function MysteryPage() {
  if (!(await hasClub())) redirect("/onboarding");

  const res = await getDailyMystery();
  if (!res.ok) redirect("/login");

  return <MysteryArena initial={res.mystery} />;
}
