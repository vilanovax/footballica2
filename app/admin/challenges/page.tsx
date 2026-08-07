import { Crown } from "lucide-react";
import Link from "next/link";
import {
  listAdminCategories,
  listAdminRecordChallenges,
} from "@/actions/admin/challenges";
import { ChallengesPanel } from "@/components/admin/ChallengesPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

function isLiveChallenge(c: {
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
}): boolean {
  if (!c.isActive) return false;
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  if (Number.isFinite(start) && start > now) return false;
  if (c.expiresAt) {
    const end = new Date(c.expiresAt).getTime();
    if (Number.isFinite(end) && end < now) return false;
  }
  return true;
}

export default async function AdminChallengesPage() {
  const [challenges, categories] = await Promise.all([
    listAdminRecordChallenges(),
    listAdminCategories(),
  ]);

  const liveCount = challenges.filter(isLiveChallenge).length;
  const unlocked = challenges.reduce((n, c) => n + c.unlockCount, 0);
  const conquered = challenges.reduce((n, c) => n + c.conquerCount, 0);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/30">
              <Crown className="h-3 w-3" strokeWidth={2.5} />
              Crowns
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              Unlock → survive → badge
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Premium Challenges
            <AdminHelpTip
              text="Timed Survival campaigns sold with coins. Players unlock once, then spend stamina per run and earn a showcase badge on conquer. Per-challenge themes override the global theme from Game Config."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Live-Ops crowns & campaigns · theme week in{" "}
            <Link
              href="/admin/config"
              className="font-semibold text-amber-300 underline-offset-2 hover:underline"
            >
              Game Config
            </Link>
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Live" value={liveCount} />
            <HeroStat label="Total" value={challenges.length} />
            <HeroStat label="Unlocked" value={unlocked} muted />
            <HeroStat label="Conquered" value={conquered} muted />
          </div>
        </div>
      </div>

      <ChallengesPanel
        initialChallenges={challenges}
        categories={categories}
      />
    </div>
  );
}

function HeroStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
      <p
        className={[
          "text-sm font-bold tabular-nums",
          muted ? "text-white/85" : "text-white",
        ].join(" ")}
      >
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
        {label}
      </p>
    </div>
  );
}
