import { redirect } from "next/navigation";
import { hasDummyClub } from "@/lib/dev/dummyClub";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // Already onboarded → straight to the hub.
  if (await hasDummyClub()) redirect("/club");

  return <Onboarding />;
}
