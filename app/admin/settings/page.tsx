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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Question bank tools — import with preview, backup, format sync.
        </p>
      </div>

      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Live-Ops
        </p>
        <LiveOpsFormatsPanel initial={liveops} />
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Question bank
        </p>
        <ImportExportPanel categories={options} />
      </section>
    </div>
  );
}
