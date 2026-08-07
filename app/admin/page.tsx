import Link from "next/link";
import {
  ListChecks,
  CheckCircle2,
  Flag,
  Layers,
  Activity,
  AlertTriangle,
  GaugeCircle,
  ArrowUpRight,
  BarChart3,
  Sparkles,
  Users,
  Trophy,
  Target,
  Coins,
  Radio,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import {
  DifficultyBadge,
  QuestionStatusBadge,
} from "@/components/admin/AdminBadge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("en-US");
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

function timeAgo(date: Date): string {
  const sec = Math.round((Date.now() - date.getTime()) / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type LocalePreview = { text?: string };
function preview(content: unknown): { en: string; fa: string } {
  const c = (content ?? {}) as { en?: LocalePreview; fa?: LocalePreview };
  return {
    en: c.en?.text?.trim() || "Untitled question",
    fa: c.fa?.text?.trim() || "",
  };
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  href,
  alert,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "sky" | "violet" | "amber" | "indigo" | "emerald" | "rose";
  hint?: string;
  href?: string;
  alert?: boolean;
}) {
  const tones = {
    sky: {
      bar: "bg-sky-500",
      icon: "bg-sky-50 text-sky-700 ring-sky-100",
      wash: "from-sky-50/80",
    },
    violet: {
      bar: "bg-violet-500",
      icon: "bg-violet-50 text-violet-700 ring-violet-100",
      wash: "from-violet-50/80",
    },
    amber: {
      bar: "bg-amber-500",
      icon: "bg-amber-50 text-amber-800 ring-amber-100",
      wash: "from-amber-50/80",
    },
    indigo: {
      bar: "bg-indigo-500",
      icon: "bg-indigo-50 text-indigo-700 ring-indigo-100",
      wash: "from-indigo-50/80",
    },
    emerald: {
      bar: "bg-emerald-500",
      icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      wash: "from-emerald-50/80",
    },
    rose: {
      bar: "bg-rose-500",
      icon: "bg-rose-50 text-rose-700 ring-rose-100",
      wash: "from-rose-50/80",
    },
  }[tone];

  const body = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white shadow-sm",
        alert
          ? "border-rose-200 ring-1 ring-rose-100"
          : "border-slate-200/90",
        href && "transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b to-transparent",
          tones.wash,
        )}
      />
      <div className={cn("absolute inset-y-0 start-0 w-1", tones.bar)} />
      <div className="relative flex items-start justify-between gap-2 px-4 pb-3.5 pt-3.5 ps-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-slate-900">
            {n(value)}
          </p>
          {hint ? (
            <p className="mt-1 truncate text-xs font-medium text-slate-500">
              {hint}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
            tones.icon,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80">
            <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
          >
            {action.label}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatBar({
  label,
  sublabel,
  value,
  max,
  color,
  badge,
}: {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  color: string;
  badge?: string;
}) {
  const width = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-slate-700">{label}</span>
          {sublabel ? (
            <span dir="rtl" className="text-xs text-slate-400">
              {sublabel}
            </span>
          ) : null}
          {badge ? (
            <span className="rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-bold text-amber-800 ring-1 ring-amber-100">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-900">
          {n(value)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-[width]", color)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function RateTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-lg font-bold tabular-nums text-slate-900">
          {value}
        </span>
        {unit ? (
          <span className="text-xs font-medium text-slate-400">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

function MiniStat({
  value,
  label,
  emphasize,
}: {
  value: number | string;
  label: string;
  emphasize?: "amber" | "emerald" | "rose";
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
      <p
        className={cn(
          "text-2xl font-bold tabular-nums tracking-tight",
          emphasize === "amber" && "text-amber-700",
          emphasize === "emerald" && "text-emerald-600",
          emphasize === "rose" && "text-rose-600",
          !emphasize && "text-slate-900",
        )}
      >
        {typeof value === "number" ? n(value) : value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    config,
    totalQuestions,
    totalTags,
    statusGroups,
    difficultyGroups,
    reportGroups,
    plays,
    temporalCount,
    categories,
    recent,
    mostPlayed,
    playerCount,
    botCount,
    matchesWeek,
    modeGroups,
    challengeLive,
    challengeTotal,
    challengeUnlocks,
    challengeConquers,
    missionActiveBatches,
    missionBatchesTotal,
    chestClaims,
    survivalMatchesWeek,
    coinsEarnedWeek,
  ] = await Promise.all([
    getGameConfig(),
    prisma.question.count(),
    prisma.tag.count(),
    prisma.question.groupBy({ by: ["status"], _count: true }),
    prisma.question.groupBy({ by: ["difficulty"], _count: true }),
    prisma.questionReport.groupBy({ by: ["status"], _count: true }),
    prisma.question.aggregate({
      _sum: { timesServed: true, timesCorrect: true },
    }),
    prisma.question.count({ where: { isTemporal: true } }),
    prisma.category.findMany({
      select: {
        id: true,
        nameEn: true,
        nameFa: true,
        challengeOnly: true,
        _count: { select: { questions: true } },
      },
    }),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        content: true,
        difficulty: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.question.findMany({
      where: { timesServed: { gt: 0 } },
      orderBy: { timesServed: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        timesServed: true,
        timesCorrect: true,
      },
    }),
    prisma.user.count({ where: { isBot: false } }),
    prisma.user.count({ where: { isBot: true } }),
    prisma.match.count({
      where: { finishedAt: { gte: weekAgo } },
    }),
    prisma.match.groupBy({
      by: ["mode"],
      where: { finishedAt: { gte: weekAgo } },
      _count: true,
      _sum: { coinsEarned: true, xpEarned: true },
    }),
    prisma.recordChallenge.count({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.recordChallenge.count(),
    prisma.clubChallengeAccess.count(),
    prisma.clubChallengeRun.count({
      where: { conqueredAt: { not: null } },
    }),
    prisma.missionBatch.count({ where: { isActive: true } }),
    prisma.missionBatch.count(),
    prisma.clubMissionBatch.count({
      where: { chestClaimedAt: { not: null } },
    }),
    prisma.match.count({
      where: { mode: "SURVIVAL", finishedAt: { gte: weekAgo } },
    }),
    prisma.match.aggregate({
      where: { finishedAt: { gte: weekAgo } },
      _sum: { coinsEarned: true },
    }),
  ]);

  const status = {
    PUBLISHED: 0,
    IN_REVIEW: 0,
    DRAFT: 0,
    RETIRED: 0,
  } as Record<string, number>;
  for (const g of statusGroups) status[g.status] = g._count;

  const difficulty = { EASY: 0, MEDIUM: 0, HARD: 0 } as Record<string, number>;
  for (const g of difficultyGroups) difficulty[g.difficulty] = g._count;

  const reports = { PENDING: 0, RESOLVED: 0, REJECTED: 0 } as Record<
    string,
    number
  >;
  for (const g of reportGroups) reports[g.status] = g._count;
  const totalReports = reports.PENDING + reports.RESOLVED + reports.REJECTED;

  const totalPlays = plays._sum.timesServed ?? 0;
  const totalCorrect = plays._sum.timesCorrect ?? 0;
  const accuracy = pct(totalCorrect, totalPlays);
  const publishedPct = pct(status.PUBLISHED, totalQuestions);
  const needsReview = status.DRAFT + status.IN_REVIEW;

  const topCategories = [...categories]
    .sort((a, b) => b._count.questions - a._count.questions)
    .slice(0, 6);
  const maxCatCount = topCategories[0]?._count.questions ?? 0;
  const uncategorized = Math.max(
    0,
    totalQuestions - categories.reduce((s, c) => s + c._count.questions, 0),
  );
  const challengeOnlyBanks = categories.filter((c) => c.challengeOnly).length;

  const modeMap: Record<
    string,
    { count: number; coins: number; xp: number }
  > = {};
  for (const g of modeGroups) {
    modeMap[g.mode] = {
      count: g._count,
      coins: g._sum.coinsEarned ?? 0,
      xp: g._sum.xpEarned ?? 0,
    };
  }
  const modeRows = [
    { id: "SURVIVAL", label: "Survival", color: "bg-rose-500" },
    { id: "PENALTY", label: "Penalty", color: "bg-emerald-500" },
    { id: "QUICK_MATCH", label: "Quick Match", color: "bg-amber-500" },
    { id: "TUTORIAL", label: "Tutorial", color: "bg-slate-400" },
  ] as const;
  const maxModeCount = Math.max(
    1,
    ...modeRows.map((m) => modeMap[m.id]?.count ?? 0),
  );

  const weekCoins = coinsEarnedWeek._sum.coinsEarned ?? 0;

  const liveChallenges = await prisma.recordChallenge.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { startsAt: "desc" },
    take: 5,
    select: {
      id: true,
      titleEn: true,
      titleFa: true,
      unlockCostCoins: true,
      targetScore: true,
      expiresAt: true,
      _count: { select: { access: true, runs: true } },
    },
  });

  const attention =
    reports.PENDING + needsReview > 0
      ? `${n(reports.PENDING)} reports · ${n(needsReview)} in queue`
      : "Queues clear";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-5 text-white shadow-sm sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-10 bottom-0 h-32 w-32 rounded-full bg-sky-400/15 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                <Radio className="h-3 w-3" strokeWidth={2.5} />
                Live-Ops
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">
                {attention}
              </span>
            </div>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white">
              Control room
            </h1>
            <p className="mt-1 max-w-xl text-sm font-medium text-slate-400">
              Pulse on players, economy rates, challenges, and content health —
              jump straight to what needs a hand.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickLink href="/admin/config" label="Config" icon={Coins} dark />
            <QuickLink
              href="/admin/questions"
              label="Questions"
              icon={ListChecks}
              dark
            />
            <QuickLink href="/admin/reports" label="Reports" icon={Flag} dark />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Players"
          value={playerCount}
          icon={Users}
          tone="sky"
          hint={`${n(botCount)} bots`}
          href="/admin/users"
        />
        <KpiCard
          label="Matches (7d)"
          value={matchesWeek}
          icon={Activity}
          tone="violet"
          hint={`${n(weekCoins)} coins paid`}
        />
        <KpiCard
          label="Live challenges"
          value={challengeLive}
          icon={Trophy}
          tone="amber"
          hint={`${n(challengeTotal)} total · ${n(challengeConquers)} conquered`}
          href="/admin/challenges"
        />
        <KpiCard
          label="Mission batches"
          value={missionActiveBatches}
          icon={Target}
          tone="indigo"
          hint={`${n(missionBatchesTotal)} total · ${n(chestClaims)} chests`}
          href="/admin/missions"
        />
        <KpiCard
          label="Published Qs"
          value={status.PUBLISHED}
          icon={CheckCircle2}
          tone="emerald"
          hint={`${publishedPct}% of ${n(totalQuestions)}`}
          href="/admin/questions"
        />
        <KpiCard
          label="Open reports"
          value={reports.PENDING}
          icon={Flag}
          tone="rose"
          hint={reports.PENDING > 0 ? "Needs triage" : "Queue clear"}
          href="/admin/reports"
          alert={reports.PENDING > 0}
        />
      </div>

      {/* Economy snapshot */}
      <Panel
        title="Game Config — live rates"
        icon={Coins}
        action={{ label: "Open", href: "/admin/config" }}
      >
        <p className="mb-3 text-xs font-medium text-slate-500">
          From GameConfig — change without redeploy. Watch Survival coins if
          wallets inflate.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <RateTile
            label="Survival coins"
            value={config.survival.coinsPerCorrect}
            unit="/correct"
          />
          <RateTile
            label="Survival XP"
            value={config.survival.xpPerCorrect}
            unit="/correct"
          />
          <RateTile
            label="Match win"
            value={config.rewards.coinsPerWin}
            unit="coins"
          />
          <RateTile label="Match XP/goal" value={config.rewards.baseXp} />
          <RateTile
            label="Duel week"
            value={config.duel.winWeeklyXp}
            unit="XP"
          />
          <RateTile
            label="Survival stamina"
            value={config.survival.staminaCost}
          />
        </div>
      </Panel>

      {/* Live Ops */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Premium challenges"
          icon={Trophy}
          action={{ label: "Manage", href: "/admin/challenges" }}
        >
          <div className="mb-4 grid grid-cols-3 gap-2">
            <MiniStat value={challengeLive} label="live now" />
            <MiniStat value={challengeUnlocks} label="unlocks" />
            <MiniStat
              value={challengeConquers}
              label="conquers"
              emphasize="amber"
            />
          </div>
          {liveChallenges.length === 0 ? (
            <EmptyHint text="No live challenges — create one for the Survival lobby." />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-100">
              {liveChallenges.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {c.titleEn}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {n(c.unlockCostCoins)} unlock · target {n(c.targetScore)}
                      {c.expiresAt
                        ? ` · ends ${timeAgo(c.expiresAt).replace("ago", "").trim()}`
                        : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] font-semibold text-slate-500">
                    <span className="tabular-nums">
                      {n(c._count.access)} unlocks
                    </span>
                    <span className="tabular-nums">
                      {n(c._count.runs)} runs
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs font-medium text-slate-500">
            {n(challengeOnlyBanks)} challenge-only banks ·{" "}
            {n(survivalMatchesWeek)} Survival matches this week
          </p>
        </Panel>

        <Panel title="Match mix (7 days)" icon={BarChart3}>
          {matchesWeek === 0 ? (
            <EmptyHint text="No finished matches in the last 7 days." />
          ) : (
            <div className="space-y-3.5">
              {modeRows.map((m) => {
                const row = modeMap[m.id] ?? { count: 0, coins: 0, xp: 0 };
                return (
                  <div key={m.id}>
                    <StatBar
                      label={m.label}
                      value={row.count}
                      max={maxModeCount}
                      color={m.color}
                    />
                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      {n(row.coins)} coins · {n(row.xp)} XP earned
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
            Active mission batches: {n(missionActiveBatches)}. Chests claimed
            lifetime: {n(chestClaims)}.
          </p>
        </Panel>
      </div>

      {/* Content pipeline */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Publishing pipeline"
          icon={Activity}
          action={{ label: "Manage", href: "/admin/questions" }}
        >
          <div className="mb-4 flex items-end gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums text-slate-900">
              {publishedPct}%
            </span>
            <span className="pb-1.5 text-sm font-semibold text-emerald-600">
              live
            </span>
          </div>
          <div className="space-y-3">
            <StatBar
              label="Published"
              value={status.PUBLISHED}
              max={totalQuestions}
              color="bg-emerald-500"
            />
            <StatBar
              label="In review"
              value={status.IN_REVIEW}
              max={totalQuestions}
              color="bg-amber-500"
            />
            <StatBar
              label="Draft"
              value={status.DRAFT}
              max={totalQuestions}
              color="bg-slate-400"
            />
            <StatBar
              label="Retired"
              value={status.RETIRED}
              max={totalQuestions}
              color="bg-rose-400"
            />
          </div>
        </Panel>

        <Panel title="Difficulty mix" icon={BarChart3}>
          <div className="space-y-3.5 pt-0.5">
            <StatBar
              label="Easy"
              value={difficulty.EASY}
              max={totalQuestions}
              color="bg-emerald-500"
            />
            <StatBar
              label="Medium"
              value={difficulty.MEDIUM}
              max={totalQuestions}
              color="bg-amber-500"
            />
            <StatBar
              label="Hard"
              value={difficulty.HARD}
              max={totalQuestions}
              color="bg-rose-500"
            />
          </div>
          <p className="mt-4 text-xs font-medium text-slate-500">
            Authored buckets for filtering. Live difficulty (Elo) evolves from
            real play.
          </p>
        </Panel>
      </div>

      {/* Category + engagement */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Category coverage"
          icon={Layers}
          action={{ label: "Categories", href: "/admin/categories" }}
        >
          {topCategories.length === 0 ? (
            <EmptyHint text="No categories yet." />
          ) : (
            <div className="space-y-3.5">
              {topCategories.map((c) => (
                <StatBar
                  key={c.id}
                  label={c.nameEn}
                  sublabel={c.nameFa}
                  value={c._count.questions}
                  max={maxCatCount}
                  color={c.challengeOnly ? "bg-amber-500" : "bg-sky-500"}
                  badge={c.challengeOnly ? "Challenge-only" : undefined}
                />
              ))}
              {uncategorized > 0 ? (
                <StatBar
                  label="Uncategorized"
                  value={uncategorized}
                  max={maxCatCount}
                  color="bg-slate-300"
                />
              ) : null}
            </div>
          )}
        </Panel>

        <Panel title="Answer engagement" icon={GaugeCircle}>
          {totalPlays === 0 ? (
            <EmptyHint text="No answer data yet — stats appear once players start playing." />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat value={totalPlays} label="served" />
                <MiniStat value={totalCorrect} label="correct" />
                <MiniStat
                  value={`${accuracy}%`}
                  label="accuracy"
                  emphasize="emerald"
                />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Most played
                </p>
                <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-100">
                  {mostPlayed.map((q) => {
                    const p = preview(q.content);
                    const acc = pct(q.timesCorrect, q.timesServed);
                    return (
                      <li key={q.id}>
                        <Link
                          href={`/admin/questions/${q.id}/edit`}
                          className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-slate-50"
                        >
                          <span className="min-w-0 truncate text-sm font-medium text-slate-700">
                            {p.en}
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                            <span className="tabular-nums text-slate-400">
                              {n(q.timesServed)}×
                            </span>
                            <span
                              className={cn(
                                "min-w-10 rounded-md px-1.5 py-0.5 text-center tabular-nums",
                                acc >= 50
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-600",
                              )}
                            >
                              {acc}%
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Recent + health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Recently added questions"
            icon={Sparkles}
            action={{ label: "All questions", href: "/admin/questions" }}
          >
            {recent.length === 0 ? (
              <EmptyHint text="No questions yet." />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-100">
                {recent.map((q) => {
                  const p = preview(q.content);
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/admin/questions/${q.id}/edit`}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            {p.en}
                          </span>
                          {p.fa ? (
                            <span
                              dir="rtl"
                              className="mt-0.5 block truncate text-xs text-slate-400"
                            >
                              {p.fa}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <DifficultyBadge difficulty={q.difficulty} />
                          <QuestionStatusBadge status={q.status} />
                          <span className="hidden w-14 text-right text-[11px] font-semibold text-slate-400 sm:block">
                            {timeAgo(q.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Health & moderation" icon={AlertTriangle}>
          <ul className="space-y-1.5">
            <HealthRow
              label="Needs review"
              value={needsReview}
              tone={needsReview > 0 ? "amber" : "ok"}
              href="/admin/questions"
            />
            <HealthRow
              label="Time-sensitive facts"
              value={temporalCount}
              tone={temporalCount > 0 ? "sky" : "ok"}
              href="/admin/questions"
            />
            <HealthRow
              label="Tags in bank"
              value={totalTags}
              tone="slate"
              href="/admin/categories"
            />
            <HealthRow
              label="Open reports"
              value={reports.PENDING}
              tone={reports.PENDING > 0 ? "rose" : "ok"}
              href="/admin/reports"
            />
            <HealthRow
              label="Reports resolved"
              value={reports.RESOLVED}
              tone="ok"
              href="/admin/reports"
            />
            <HealthRow
              label="Questions total"
              value={totalQuestions}
              tone="slate"
              href="/admin/questions"
            />
          </ul>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
            {totalReports === 0
              ? "No reports filed yet."
              : `${n(totalReports)} report${totalReports === 1 ? "" : "s"} lifetime.`}
          </p>
        </Panel>
      </div>

      {/* Quick links dock */}
      <nav className="sticky bottom-3 z-10">
        <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-lg shadow-slate-900/5 backdrop-blur">
          <QuickLink href="/admin/config" label="Game Config" icon={Coins} />
          <QuickLink href="/admin/challenges" label="Challenges" icon={Trophy} />
          <QuickLink href="/admin/missions" label="Missions" icon={Target} />
          <QuickLink href="/admin/users" label="Users & Bots" icon={Users} />
          <QuickLink
            href="/admin/questions"
            label="Questions"
            icon={ListChecks}
          />
          <QuickLink href="/admin/reports" label="Reports" icon={Flag} />
        </div>
      </nav>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 py-8 text-center ring-1 ring-slate-100">
      <Sparkles className="h-5 w-5 text-slate-300" />
      <p className="max-w-xs text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
  dark,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        dark
          ? "bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/15 hover:text-white"
          : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {label}
    </Link>
  );
}

function HealthRow({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "ok" | "amber" | "rose" | "sky" | "slate";
  href: string;
}) {
  const styles = {
    ok: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50 text-amber-900 ring-amber-100",
    rose: "bg-rose-50 text-rose-800 ring-rose-100",
    sky: "bg-sky-50 text-sky-800 ring-sky-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
  }[tone];
  const dot = {
    ok: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
    slate: "bg-slate-400",
  }[tone];

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 ring-1 transition-colors hover:brightness-[0.98]",
          styles,
        )}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          {label}
        </span>
        <span className="font-bold tabular-nums">{n(value)}</span>
      </Link>
    </li>
  );
}
