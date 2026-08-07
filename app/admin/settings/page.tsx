import type { ReactNode } from "react";
import { Database, Layers, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getLiveopsFormatsSnapshot } from "@/actions/admin/liveopsFormats";
import { ImportExportPanel } from "@/components/admin/ImportExportPanel";
import { LiveOpsFormatsPanel } from "@/components/admin/LiveOpsFormatsPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [categories, liveops, questionCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: { nameEn: "asc" },
      select: {
        id: true,
        nameEn: true,
        nameFa: true,
        _count: { select: { questions: true } },
      },
    }),
    getLiveopsFormatsSnapshot(),
    prisma.question.count(),
  ]);

  const options = categories.map((c) => ({
    id: c.id,
    nameEn: c.nameEn,
    nameFa: c.nameFa,
    _count: c._count.questions,
  }));

  const publishedFormats =
    liveops.published.IMAGE +
    liveops.published.CAREER_PATH +
    liveops.published.HIGHER_LOWER +
    liveops.published.REVEAL_IMAGE;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-10 bottom-0 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
              <Database className="h-3 w-3" strokeWidth={2.5} />
              Bank tools
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              Sync · Backup · Import
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Settings
            <AdminHelpTip
              wide
              title="Bank tools"
              text="Sync the format pack into the published bank, download a JSON backup, or import AI-shaped questions with preview + L1 dedupe before anything writes."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            ایمپورت، بکاپ و سینک فرمت‌ها
          </p>
          <div className="mt-3 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Categories" value={categories.length} />
            <HeroStat label="Questions" value={questionCount} />
            <HeroStat
              label="Format pack"
              value={liveops.packSize}
              icon={<Layers className="h-3 w-3 text-emerald-300" />}
            />
            <HeroStat
              label="Published formats"
              value={publishedFormats}
              muted
              icon={<Upload className="h-3 w-3 text-sky-300" />}
            />
          </div>
        </div>
      </div>

      <LiveOpsFormatsPanel initial={liveops} />
      <ImportExportPanel categories={options} />
    </div>
  );
}

function HeroStat({
  label,
  value,
  muted,
  icon,
}: {
  label: string;
  value: number;
  muted?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/55">
        {icon}
        {label}
      </p>
      <p
        className={[
          "mt-0.5 text-sm font-bold tabular-nums",
          muted ? "text-white/80" : "text-white",
        ].join(" ")}
      >
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}
