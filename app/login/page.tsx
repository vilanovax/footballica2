import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser, hasClub } from "@/lib/player/current";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect((await hasClub()) ? "/club" : "/onboarding");
  }

  return <LoginForm />;
}
