import { Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      orderBy: { nameEn: "asc" },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameFa: true,
        icon: true,
        isActive: true,
        challengeOnly: true,
        locales: true,
        _count: { select: { questions: true } },
      },
    }),
    prisma.tag.findMany({
      orderBy: { nameEn: "asc" },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameFa: true,
        _count: { select: { questions: true } },
      },
    }),
  ]);

  const mappedCategories = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    nameEn: c.nameEn,
    nameFa: c.nameFa,
    icon: c.icon,
    isActive: c.isActive,
    challengeOnly: c.challengeOnly,
    locales: c.locales,
    count: c._count.questions,
  }));
  const mappedTags = tags.map((t) => ({
    id: t.id,
    slug: t.slug,
    nameEn: t.nameEn,
    nameFa: t.nameFa,
    count: t._count.questions,
  }));

  const activeCats = mappedCategories.filter((c) => c.isActive).length;
  const challengeCats = mappedCategories.filter((c) => c.challengeOnly).length;
  const totalQ = mappedCategories.reduce((n, c) => n + c.count, 0);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/30">
              <Layers className="h-3 w-3" strokeWidth={2.5} />
              Taxonomy
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">
              {mappedCategories.length} banks · {mappedTags.length} tags
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Categories &amp; Tags
            <AdminHelpTip
              wide
              title="Taxonomy"
              text="Categories are question banks for Survival / Duel draws. Tags are cross-cutting labels for Live-Ops filtering."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-400">
            Banks for the question picker · tags for cross-cutting labels.
          </p>
          <div className="mt-3 grid max-w-lg grid-cols-3 gap-2">
            <HeroStat label="Active" value={activeCats} />
            <HeroStat label="Challenge" value={challengeCats} />
            <HeroStat label="Questions" value={totalQ} />
          </div>
        </div>
      </div>

      <TaxonomyManager categories={mappedCategories} tags={mappedTags} />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
      <p className="text-sm font-bold tabular-nums text-white">
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}
