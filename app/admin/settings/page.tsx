import { prisma } from "@/lib/prisma";
import { getLiveopsFormatsSnapshot } from "@/actions/admin/liveopsFormats";
import { ImportExportPanel } from "@/components/admin/ImportExportPanel";
import { LiveOpsFormatsPanel } from "@/components/admin/LiveOpsFormatsPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [categories, liveops] = await Promise.all([
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
  ]);

  const options = categories.map((c) => ({
    id: c.id,
    nameEn: c.nameEn,
    nameFa: c.nameFa,
    _count: c._count.questions,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight text-slate-900">
          Settings
          <AdminHelpTip
            wide
            title="Bank tools"
            text="Sync the format pack into the published bank, download a JSON backup, or import AI-shaped questions with preview + L1 dedupe before anything writes."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          ایمپورت، بکاپ و سینک فرمت‌ها
        </p>
      </div>

      <LiveOpsFormatsPanel initial={liveops} />
      <ImportExportPanel categories={options} />
    </div>
  );
}
