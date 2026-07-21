import Link from "next/link";
import { Plus, Pencil, ArrowDownUp } from "lucide-react";
import type { Prisma } from "@prisma/client";
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
  QuestionStatusBadge,
} from "@/components/admin/AdminBadge";
import { ToggleStatusButton } from "@/components/admin/ToggleStatusButton";
import { QuestionFilters } from "@/components/admin/QuestionFilters";
import { QuestionSearch } from "@/components/admin/QuestionSearch";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { Pagination } from "@/components/admin/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type LocalePreview = { text?: string };

/** Pull the EN + FA prompt text out of the stored content JSON for the table. */
function questionPreview(content: unknown): { en: string; fa: string } {
  const c = (content ?? {}) as { en?: LocalePreview; fa?: LocalePreview };
  return {
    en: c.en?.text?.trim() || "Untitled question",
    fa: c.fa?.text?.trim() || "",
  };
}

type SearchParams = {
  category?: string;
  tag?: string;
  q?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

/** Translate the sort/dir params into a Prisma orderBy (defaults to newest). */
function buildOrderBy(
  sort: string | undefined,
  dir: "asc" | "desc",
): Prisma.QuestionOrderByWithRelationInput {
  switch (sort) {
    case "category":
      return { category: { nameEn: dir } };
    case "difficulty":
      return { difficulty: dir };
    case "status":
      return { status: dir };
    default:
      return { createdAt: "desc" };
  }
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { category, tag } = sp;
  const q = sp.q?.trim() || "";
  const sort = sp.sort;
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.QuestionWhereInput = {
    ...(category ? { categoryId: category } : {}),
    ...(tag ? { tags: { some: { id: tag } } } : {}),
    ...(q
      ? {
          OR: [
            { content: { path: ["en", "text"], string_contains: q } },
            { content: { path: ["fa", "text"], string_contains: q } },
          ],
        }
      : {}),
  };

  const orderBy = buildOrderBy(sort, dir);

  // Count first so we can clamp the page and paginate the heavy query.
  const [total, categories, tags] = await Promise.all([
    prisma.question.count({ where }),
    prisma.category.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
    prisma.tag.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const questions = await prisma.question.findMany({
    where,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      type: true,
      difficulty: true,
      status: true,
      content: true,
      category: { select: { nameEn: true, nameFa: true } },
      tags: { select: { slug: true } },
    },
  });

  const isFiltered = Boolean(category || tag || q);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Questions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("en-US")} question
            {total === 1 ? "" : "s"}
            {isFiltered ? " match your filters." : " in the bank."}
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

      <div className="flex flex-wrap items-end justify-between gap-4">
        <QuestionSearch />
        <QuestionFilters
          categories={categories}
          tags={tags}
          category={category}
          tag={tag}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Question
              </TableHead>
              <TableHead>
                <SortableHeader label="Category" sortKey="category" />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tags
              </TableHead>
              <TableHead>
                <SortableHeader label="Difficulty" sortKey="difficulty" />
              </TableHead>
              <TableHead>
                <SortableHeader label="Status" sortKey="status" />
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-14 text-center text-muted-foreground"
                >
                  {isFiltered
                    ? "No questions match your search or filters."
                    : "No questions yet. Create one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question) => {
                const preview = questionPreview(question.content);
                return (
                  <TableRow key={question.id} className="group">
                    <TableCell className="max-w-sm py-3">
                      <Link
                        href={`/admin/questions/${question.id}/edit`}
                        className="flex items-center gap-2"
                      >
                        <TypeBadge type={question.type} />
                        <span className="flex min-w-0 flex-col">
                          <span className="block truncate font-medium text-slate-800 group-hover:text-slate-950 group-hover:underline">
                            {preview.en}
                          </span>
                          {preview.fa && (
                            <span
                              dir="rtl"
                              className="block truncate text-xs text-muted-foreground"
                            >
                              {preview.fa}
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {question.category ? (
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium text-slate-700">
                            {question.category.nameEn}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {question.category.nameFa}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {question.tags.length ? (
                        <div className="flex flex-wrap gap-1">
                          {question.tags.map((t) => (
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
                      <DifficultyBadge difficulty={question.difficulty} />
                    </TableCell>
                    <TableCell>
                      <QuestionStatusBadge status={question.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/questions/${question.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                        </Button>
                        <ToggleStatusButton
                          id={question.id}
                          status={question.status}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
