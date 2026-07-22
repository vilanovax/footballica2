import { redirect } from "next/navigation";
import { getCurrentUser, hasClub } from "@/lib/player/current";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasClub())) redirect("/onboarding");
  redirect("/club");
}
