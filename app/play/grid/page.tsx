import { redirect } from "next/navigation";
import { hasClub } from "@/lib/player/current";
import { getDailyGrid } from "@/actions/grid/getDailyGrid";
import { GridArena } from "@/components/grid/GridArena";

export const dynamic = "force-dynamic";

export default async function GridPage() {
  if (!(await hasClub())) redirect("/onboarding");

  const res = await getDailyGrid();
  if (!res.ok) redirect("/login");

  return <GridArena initial={res.grid} />;
}
