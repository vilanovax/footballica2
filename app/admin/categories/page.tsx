import { prisma } from "@/lib/prisma";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Categories &amp; Tags
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Banks for the question picker · tags for cross-cutting labels.
        </p>
      </div>

      <TaxonomyManager
        categories={categories.map((c) => ({
          id: c.id,
          slug: c.slug,
          nameEn: c.nameEn,
          nameFa: c.nameFa,
          icon: c.icon,
          isActive: c.isActive,
          challengeOnly: c.challengeOnly,
          locales: c.locales,
          count: c._count.questions,
        }))}
        tags={tags.map((t) => ({
          id: t.id,
          slug: t.slug,
          nameEn: t.nameEn,
          nameFa: t.nameFa,
          count: t._count.questions,
        }))}
      />
    </div>
  );
}
