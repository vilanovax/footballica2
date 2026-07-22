import { redirect } from "next/navigation";
import { getCurrentUser, hasClub } from "@/lib/player/current";
import { getMyDuels } from "@/actions/duel/getMyDuels";
import { getDuelInbox } from "@/actions/duel/getInboxCount";
import { PlayModes } from "@/components/play/PlayModes";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasClub())) redirect("/onboarding");

  const [res, inbox] = await Promise.all([getMyDuels(), getDuelInbox()]);
  const recentDuels = res.ok ? res.history : [];

  return (
    <PlayModes
      recentDuels={recentDuels}
      inboxCount={inbox.ok ? inbox.count : 0}
      inboxItems={inbox.ok ? inbox.items : []}
    />
  );
}
