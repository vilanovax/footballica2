import { prisma } from "@/lib/prisma";
import { getLiveopsFormatsSnapshot } from "@/actions/admin/liveopsFormats";
import { ImportExportPanel } from "@/components/admin/ImportExportPanel";
import { LiveOpsFormatsPanel } from "@/components/admin/LiveOpsFormatsPanel";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sync format packs, backup the bank, and import questions with
          preview, edit, and confirm.
        </p>
      </div>

      <LiveOpsFormatsPanel initial={liveops} />

      <ImportExportPanel categories={options} />
    </div>
  );
}
