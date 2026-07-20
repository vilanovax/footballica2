import { ListChecks, CheckCircle2, Flag, Layers, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Card>
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
        <p className="text-3xl font-semibold tabular-nums">
          {value.toLocaleString("en-US")}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const [
    totalQuestions,
    activeQuestions,
    pendingReports,
    totalCategories,
    totalTags,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { isActive: true } }),
    prisma.questionReport.count({ where: { status: "PENDING" } }),
    prisma.category.count(),
    prisma.tag.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Content health at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Questions"
          value={totalQuestions}
          icon={ListChecks}
          accent="bg-slate-100 text-slate-600"
        />
        <KpiCard
          label="Active Questions"
          value={activeQuestions}
          icon={CheckCircle2}
          accent="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          label="Pending Reports"
          value={pendingReports}
          icon={Flag}
          accent="bg-amber-100 text-amber-600"
        />
        <KpiCard
          label="Categories"
          value={totalCategories}
          icon={Layers}
          accent="bg-sky-100 text-sky-600"
        />
        <KpiCard
          label="Tags"
          value={totalTags}
          icon={Tags}
          accent="bg-violet-100 text-violet-600"
        />
      </div>
    </div>
  );
}
