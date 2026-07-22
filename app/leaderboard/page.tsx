import { redirect } from "next/navigation";
import { getLeaderboard } from "@/actions/getLeaderboard";
import { getHallOfFame } from "@/actions/getHallOfFame";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { getCurrentUser, hasClub } from "@/lib/player/current";

// Standings + dev seeding read/write the DB — never prerender.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasClub())) redirect("/onboarding");

  const [board, hallOfFame] = await Promise.all([
    getLeaderboard(),
    getHallOfFame(),
  ]);

  return (
    <LeaderboardList
      rows={board.rows}
      resetsInDays={board.resetsInDays}
      hallOfFame={hallOfFame}
    />
  );
}
