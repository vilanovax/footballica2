import Link from "next/link";
import { Flag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import {
  ReportFilters,
  type ReportFilterKey,
} from "@/components/admin/ReportFilters";
import {
  ReportsQueue,
  type ReportQueueItem,
} from "@/components/admin/ReportsQueue";
import { reasonLabelEn } from "@/lib/reports/reasons";

export const dynamic = "force-dynamic";

const jalaliDate = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const jalaliTime = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  hour: "2-digit",
  minute: "2-digit",
});

const FILTER_KEYS: ReportFilterKey[] = [
  "PENDING",
  "RESOLVED",
  "REJECTED",
  "ALL",
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const raw = (sp.status ?? "PENDING").toUpperCase() as ReportFilterKey;
  const active: ReportFilterKey = FILTER_KEYS.includes(raw) ? raw : "PENDING";

  const where: Prisma.QuestionReportWhereInput =
    active === "ALL" ? {} : { status: active };

  const [reports, grouped, reasonGroups] = await Promise.all([
    prisma.questionReport.findMany({
      where,
      include: { question: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.questionReport.groupBy({ by: ["status"], _count: true }),
    prisma.questionReport.groupBy({
      by: ["reason"],
      where: { status: "PENDING" },
      _count: true,
    }),
  ]);

  const counts: Record<ReportFilterKey, number> = {
    PENDING: 0,
    RESOLVED: 0,
    REJECTED: 0,
    ALL: 0,
  };
  for (const g of grouped) {
    counts[g.status as Exclude<ReportFilterKey, "ALL">] = g._count;
    counts.ALL += g._count;
  }

  const items: ReportQueueItem[] = reports.map((r) => ({
    id: r.id,
    reasonLabel: reasonLabelEn(r.reason),
    note: r.note,
    status: r.status,
    dateLabel: jalaliDate.format(r.createdAt),
    timeLabel: jalaliTime.format(r.createdAt),
    questionId: r.questionId,
    questionType: r.question.type,
    difficulty: r.question.difficulty,
    correctIndex: r.question.correctIndex,
    mediaUrl: r.question.mediaUrl,
    content: r.question.content,
  }));

  const topReasons = reasonGroups
    .map((g) => ({
      code: g.reason,
      label: reasonLabelEn(g.reason),
      count: g._count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-rose-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-300 ring-1 ring-rose-400/30">
                <Flag className="h-3 w-3" strokeWidth={2.5} />
                Triage
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
                {counts.PENDING > 0
                  ? `${counts.PENDING} new in queue`
                  : "Queue clear"}
              </span>
            </div>
            <Link
              href="/admin/questions"
              className="text-sm font-semibold text-rose-300 underline-offset-2 hover:underline"
            >
              Question bank
            </Link>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Reports
            <AdminHelpTip
              wide
              title="Question triage"
              text="Players flag questions in-quiz. New = needs action. Resolve after you fix (or accept). Reject if the report is wrong. Edit opens the question bank."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            گزارش سوالات · triage queue · dates Shamsi
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="New" value={counts.PENDING} />
            <HeroStat label="Resolved" value={counts.RESOLVED} />
            <HeroStat label="Rejected" value={counts.REJECTED} muted />
            <HeroStat label="Total" value={counts.ALL} muted />
          </div>
        </div>
      </div>

      {topReasons.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
            Open by reason
          </span>
          {topReasons.map((r) => (
            <span
              key={r.code}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-950 ring-1 ring-amber-200"
            >
              {r.label}
              <span className="tabular-nums">{r.count}</span>
            </span>
          ))}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
          <ReportFilters active={active} counts={counts} />
          <p className="text-[11px] font-semibold text-slate-700">
            Showing {items.length}
            {active === "ALL" ? ` of ${counts.ALL}` : ""}
          </p>
        </header>
        <div className="p-3">
          <ReportsQueue
            items={items}
            active={active}
            pendingCount={counts.PENDING}
          />
        </div>
      </section>
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
