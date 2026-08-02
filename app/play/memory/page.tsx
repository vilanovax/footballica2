import { redirect } from "next/navigation";
import { hasClub } from "@/lib/player/current";
import { getDailyMemory } from "@/actions/memorygotd/getDailyMemory";
import { MemoryGotdArena } from "@/components/memorygotd/MemoryGotdArena";

export const dynamic = "force-dynamic";

export default async function MemoryGotdPage() {
  if (!(await hasClub())) redirect("/onboarding");

  const res = await getDailyMemory();
  if (!res.ok) {
    if (res.error === "disabled") redirect("/play");
    redirect("/login");
  }

  return <MemoryGotdArena initial={res.memory} />;
}
