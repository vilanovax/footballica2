import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportStatusBadge } from "@/components/admin/AdminBadge";
import { ReportActions } from "@/components/admin/ReportActions";
import { ReportReview } from "@/components/admin/ReportReview";
import {
  ReportFilters,
  type ReportFilterKey,
} from "@/components/admin/ReportFilters";
import { reasonLabelEn } from "@/lib/reports/reasons";

export const dynamic = "force-dynamic";

// Jalali (Persian solar / "Hijri Shamsi") calendar — e.g. "۳ مرداد ۱۴۰۵".
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

  const [reports, grouped] = await Promise.all([
    prisma.questionReport.findMany({
      where,
      include: { question: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.questionReport.groupBy({ by: ["status"], _count: true }),
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

  const activeLabel =
    active === "PENDING" ? "new" : active === "ALL" ? "total" : active.toLowerCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reports.length.toLocaleString("en-US")} {activeLabel} report
          {reports.length === 1 ? "" : "s"}
          {counts.PENDING > 0
            ? ` · ${counts.PENDING.toLocaleString("en-US")} awaiting triage.`
            : " · queue clear."}
        </p>
      </div>

      <ReportFilters active={active} counts={counts} />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Question
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Details
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </TableHead>
              <TableHead className="pr-6 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-14 text-center text-muted-foreground"
                >
                  {active === "PENDING"
                    ? "No new reports — the triage queue is clear."
                    : "No reports match this filter."}
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => (
                <TableRow key={r.id} className="align-top">
                  <TableCell className="max-w-sm py-3 pl-6">
                    <ReportReview
                      report={{
                        id: r.id,
                        reasonLabel: reasonLabelEn(r.reason),
                        note: r.note,
                        status: r.status,
                        dateLabel: jalaliDate.format(r.createdAt),
                        timeLabel: jalaliTime.format(r.createdAt),
                      }}
                      question={{
                        id: r.questionId,
                        type: r.question.type,
                        difficulty: r.question.difficulty,
                        correctIndex: r.question.correctIndex,
                        mediaUrl: r.question.mediaUrl,
                        content: r.question.content,
                      }}
                    />
                  </TableCell>
                  <TableCell className="max-w-xs py-3">
                    <span className="block font-medium text-slate-700">
                      {reasonLabelEn(r.reason)}
                    </span>
                    {r.note && (
                      <span
                        className="mt-0.5 block truncate text-xs text-muted-foreground"
                        title={r.note}
                      >
                        {r.note}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-3 text-slate-600">
                    <span dir="rtl" className="block">
                      {jalaliDate.format(r.createdAt)}
                    </span>
                    <span dir="rtl" className="block text-xs text-muted-foreground">
                      {jalaliTime.format(r.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <ReportStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="py-3 pr-6 text-right">
                    <ReportActions
                      reportId={r.id}
                      questionId={r.questionId}
                      status={r.status}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
