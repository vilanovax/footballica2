import Link from "next/link";
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
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Reports
            <AdminHelpTip
              wide
              title="Question triage"
              text="Players flag questions in-quiz. New = needs action. Resolve after you fix (or accept). Reject if the report is wrong. Edit opens the question bank."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            گزارش سوالات · triage queue
          </p>
        </div>
        <Link
          href="/admin/questions"
          className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          Question bank
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="New"
          value={counts.PENDING}
          hint={counts.PENDING > 0 ? "Needs triage" : "Queue clear"}
          tone={counts.PENDING > 0 ? "rose" : "emerald"}
        />
        <Stat
          label="Resolved"
          value={counts.RESOLVED}
          hint="Handled"
          tone="emerald"
        />
        <Stat
          label="Rejected"
          value={counts.REJECTED}
          hint="No change"
          tone="slate"
        />
      </div>

      {topReasons.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Open by reason
          </span>
          {topReasons.map((r) => (
            <span
              key={r.code}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-100"
            >
              {r.label}
              <span className="tabular-nums text-amber-700">{r.count}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportFilters active={active} counts={counts} />
        <p className="text-xs text-slate-500">
          Showing {items.length}
          {active === "ALL" ? ` of ${counts.ALL}` : ""} · dates Shamsi
        </p>
      </div>

      <ReportsQueue
        items={items}
        active={active}
        pendingCount={counts.PENDING}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "rose" | "emerald" | "slate";
}) {
  const border =
    tone === "rose"
      ? "border-rose-200"
      : tone === "emerald"
        ? "border-emerald-200"
        : "border-slate-200";
  const valueCls =
    tone === "rose"
      ? "text-rose-700"
      : tone === "emerald"
        ? "text-emerald-800"
        : "text-slate-900";
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${border}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueCls}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
