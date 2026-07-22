import { redirect } from "next/navigation";
import { getCurrentUser, hasClub } from "@/lib/player/current";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Already onboarded → straight to the hub.
  if (await hasClub()) redirect("/club");

  return <Onboarding />;
}
