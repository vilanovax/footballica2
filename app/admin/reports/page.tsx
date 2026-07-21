import { prisma } from "@/lib/prisma";
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
import { reasonLabelEn } from "@/lib/reports/reasons";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminReportsPage() {
  const reports = await prisma.questionReport.findMany({
    include: { question: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reports.length.toLocaleString("en-US")} user report
          {reports.length === 1 ? "" : "s"}
          {pendingCount > 0
            ? ` · ${pendingCount.toLocaleString("en-US")} pending triage.`
            : " · queue clear."}
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Question</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No reports filed yet.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                    {r.questionId}
                  </TableCell>
                  <TableCell className="max-w-sm">
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
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {dateFmt.format(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
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
