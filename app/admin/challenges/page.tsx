import {
  listAdminCategories,
  listAdminRecordChallenges,
} from "@/actions/admin/challenges";
import { ChallengesPanel } from "@/components/admin/ChallengesPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  const [challenges, categories] = await Promise.all([
    listAdminRecordChallenges(),
    listAdminCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Premium Challenges
          <AdminHelpTip text="Timed Survival campaigns sold with coins. Players unlock once, then spend stamina per run and earn a showcase badge on conquer. Per-challenge themes override the global theme from Game Config." />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live-Ops crowns & campaigns — unlock → survive → badge. Global theme
          week lives in{" "}
          <Link
            href="/admin/config"
            className="font-semibold text-amber-800 underline-offset-2 hover:underline"
          >
            Game Config & Economy
          </Link>
          .
        </p>
      </div>

      <ChallengesPanel
        initialChallenges={challenges}
        categories={categories}
      />
    </div>
  );
}
