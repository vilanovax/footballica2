import { redirect } from "next/navigation";
import { getClubSnapshot, getCurrentUser, hasClub } from "@/lib/player/current";
import { getMyDuels } from "@/actions/duel/getMyDuels";
import { DuelLobby } from "@/components/duel/DuelLobby";

export const dynamic = "force-dynamic";

export default async function DuelLobbyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasClub())) redirect("/onboarding");

  const [res, club] = await Promise.all([getMyDuels(), getClubSnapshot()]);
  if (!res.ok) redirect("/login");

  return (
    <DuelLobby
      initialDuels={res.duels}
      initialYourTurn={res.yourTurn}
      initialHistory={res.history}
      yourAvatar={club?.avatar}
    />
  );
}
