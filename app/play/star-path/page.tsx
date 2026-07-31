import { redirect } from "next/navigation";
import { hasClub } from "@/lib/player/current";
import { getDailyStarPath } from "@/actions/starpath/getDailyStarPath";
import { StarPathArena } from "@/components/starpath/StarPathArena";

export const dynamic = "force-dynamic";

export default async function StarPathPage() {
  if (!(await hasClub())) redirect("/onboarding");

  const res = await getDailyStarPath();
  if (!res.ok) redirect("/login");

  return <StarPathArena initial={res.starPath} />;
}
