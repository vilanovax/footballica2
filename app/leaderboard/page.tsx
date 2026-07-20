import { getLeaderboard } from "@/actions/getLeaderboard";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";

// Standings + dev seeding read/write the DB — never prerender.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  return <LeaderboardList rows={rows} />;
}
