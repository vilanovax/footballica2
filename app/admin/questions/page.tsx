import Link from "next/link";
import { Plus, Pencil, ArrowDownUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TypeBadge,
  DifficultyBadge,
  StatusBadge,
} from "@/components/admin/AdminBadge";
import { ToggleStatusButton } from "@/components/admin/ToggleStatusButton";
import { QuestionFilters } from "@/components/admin/QuestionFilters";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string }>;
}) {
  const { category, tag } = await searchParams;

  const where = {
    ...(category ? { categoryId: category } : {}),
    ...(tag ? { tags: { some: { id: tag } } } : {}),
  };

  const [questions, categories, tags] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { category: true, tags: { select: { slug: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
    prisma.tag.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
  ]);

  const isFiltered = Boolean(category || tag);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Questions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {questions.length.toLocaleString("en-US")} question
            {questions.length === 1 ? "" : "s"}
            {isFiltered ? " match the filters." : " in the bank."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/settings">
              <ArrowDownUp className="h-4 w-4" />
              Import / Export
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/questions/new">
              <Plus className="h-4 w-4" />
              Create Question
            </Link>
          </Button>
        </div>
      </div>

      <QuestionFilters
        categories={categories}
        tags={tags}
        category={category}
        tag={tag}
      />

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  {isFiltered
                    ? "No questions match these filters."
                    : "No questions yet. Create one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {q.id}
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={q.type} />
                  </TableCell>
                  <TableCell>
                    {q.category ? (
                      <span className="flex flex-col leading-tight">
                        <span className="font-medium text-slate-700">
                          {q.category.nameEn}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {q.category.nameFa}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {q.tags.length ? (
                      <div className="flex flex-wrap gap-1">
                        {q.tags.map((t) => (
                          <span
                            key={t.slug}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {t.slug}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={q.isActive} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/questions/${q.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <ToggleStatusButton id={q.id} isActive={q.isActive} />
                    </div>
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
