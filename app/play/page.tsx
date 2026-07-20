import { redirect } from "next/navigation";
import { hasDummyClub } from "@/lib/dev/dummyClub";
import { PlayModes } from "@/components/play/PlayModes";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  if (!(await hasDummyClub())) redirect("/onboarding");

  return <PlayModes />;
}
