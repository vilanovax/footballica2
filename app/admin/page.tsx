import Link from "next/link";
import {
  ListChecks,
  CheckCircle2,
  Flag,
  Layers,
  Tags,
  Activity,
  Clock,
  AlertTriangle,
  GaugeCircle,
  ArrowUpRight,
  BarChart3,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DifficultyBadge, QuestionStatusBadge } from "@/components/admin/AdminBadge";

export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Presentational pieces ───────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className={href ? "transition-shadow hover:shadow-md" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums text-slate-900">
          {n(value)}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Icon className="h-4 w-4 text-slate-400" strokeWidth={2} />
          {title}
        </CardTitle>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            {action.label}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatBar({
  label,
  sublabel,
  value,
  max,
  color,
}: {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  color: string;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-baseline gap-2 text-slate-600">
          {label}
          {sublabel && (
            <span dir="rtl" className="text-xs text-slate-400">
              {sublabel}
            </span>
          )}
        </span>
        <span className="font-medium tabular-nums text-slate-800">
          {n(value)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const [
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
  ] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Content health at a glance.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Questions"
          value={totalQuestions}
          icon={ListChecks}
          accent="bg-slate-100 text-slate-600"
          hint={`${n(totalTags)} tags applied`}
          href="/admin/questions"
        />
        <KpiCard
          label="Published & Live"
          value={status.PUBLISHED}
          icon={CheckCircle2}
          accent="bg-emerald-100 text-emerald-600"
          hint={`${publishedPct}% of the bank`}
        />
        <KpiCard
          label="Needs Review"
          value={needsReview}
          icon={Clock}
          accent="bg-amber-100 text-amber-600"
          hint={`${n(status.DRAFT)} draft · ${n(status.IN_REVIEW)} in review`}
          href="/admin/questions"
        />
        <KpiCard
          label="Pending Reports"
          value={reports.PENDING}
          icon={Flag}
          accent="bg-rose-100 text-rose-600"
          hint={reports.PENDING > 0 ? "Awaiting triage" : "Queue is clear"}
          href="/admin/reports"
        />
      </div>

      {/* Pipeline + difficulty */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Publishing pipeline"
          icon={Activity}
          action={{ label: "Manage", href: "/admin/questions" }}
        >
          <div className="mb-4 flex items-end gap-2">
            <span className="text-3xl font-semibold tabular-nums text-slate-900">
              {publishedPct}%
            </span>
            <span className="pb-1 text-sm text-muted-foreground">live</span>
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
          <div className="space-y-3 pt-1">
            <StatBar
              label="Easy"
              value={difficulty.EASY}
              max={totalQuestions}
              color="bg-green-500"
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
          <p className="mt-4 text-xs text-muted-foreground">
            Authored buckets used for filtering. Live difficulty (Elo) evolves
            from real play.
          </p>
        </Panel>
      </div>

      {/* Category coverage + engagement */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Category coverage"
          icon={Layers}
          action={{ label: "Categories", href: "/admin/categories" }}
        >
          {topCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No categories yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topCategories.map((c) => (
                <StatBar
                  key={c.id}
                  label={c.nameEn}
                  sublabel={c.nameFa}
                  value={c._count.questions}
                  max={maxCatCount}
                  color="bg-sky-500"
                />
              ))}
              {uncategorized > 0 && (
                <StatBar
                  label="Uncategorized"
                  value={uncategorized}
                  max={maxCatCount}
                  color="bg-slate-300"
                />
              )}
            </div>
          )}
        </Panel>

        <Panel title="Player engagement" icon={GaugeCircle}>
          {totalPlays === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Sparkles className="h-6 w-6 text-slate-300" />
              <p className="text-sm text-muted-foreground">
                No match data yet — stats appear once players start answering.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">
                    {n(totalPlays)}
                  </p>
                  <p className="text-xs text-muted-foreground">answers served</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">
                    {n(totalCorrect)}
                  </p>
                  <p className="text-xs text-muted-foreground">correct</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-emerald-600">
                    {accuracy}%
                  </p>
                  <p className="text-xs text-muted-foreground">accuracy</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Most played
                </p>
                <ul className="divide-y">
                  {mostPlayed.map((q) => {
                    const p = preview(q.content);
                    const acc = pct(q.timesCorrect, q.timesServed);
                    return (
                      <li
                        key={q.id}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <Link
                          href={`/admin/questions/${q.id}/edit`}
                          className="min-w-0 truncate text-sm text-slate-700 hover:underline"
                        >
                          {p.en}
                        </Link>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">{n(q.timesServed)}×</span>
                          <span
                            className={`tabular-nums font-medium ${
                              acc >= 50 ? "text-emerald-600" : "text-rose-500"
                            }`}
                          >
                            {acc}%
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Recently added + health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Recently added"
            icon={Sparkles}
            action={{ label: "All questions", href: "/admin/questions" }}
          >
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No questions yet.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((q) => {
                  const p = preview(q.content);
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/admin/questions/${q.id}/edit`}
                        className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {p.en}
                          </span>
                          {p.fa && (
                            <span
                              dir="rtl"
                              className="block truncate text-xs text-muted-foreground"
                            >
                              {p.fa}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <DifficultyBadge difficulty={q.difficulty} />
                          <QuestionStatusBadge status={q.status} />
                          <span className="w-14 text-right text-xs text-slate-400">
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
          <ul className="space-y-3 text-sm">
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
              label="Retired"
              value={status.RETIRED}
              tone="slate"
              href="/admin/questions"
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
          </ul>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            {totalReports === 0
              ? "No reports filed yet."
              : `${n(totalReports)} total report${totalReports === 1 ? "" : "s"} lifetime.`}
          </p>
        </Panel>
      </div>
    </div>
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
  const dot = {
    ok: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    sky: "bg-sky-400",
    slate: "bg-slate-300",
  }[tone];
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-slate-600">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
        <span className="font-semibold tabular-nums text-slate-800">
          {n(value)}
        </span>
      </Link>
    </li>
  );
}
