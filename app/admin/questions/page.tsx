import Link from "next/link";
import { Plus, Pencil, ArrowDownUp, BookOpen } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
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
import {
  AdminHelpTip,
  AdminHowItWorks,
} from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_VALUES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "RETIRED"] as const;
type QuestionStatus = (typeof STATUS_VALUES)[number];

type LocalePreview = { text?: string };

/** Pull the EN + FA prompt text out of the stored content JSON for the table. */
function questionPreview(content: unknown): { en: string; fa: string } {
  const c = (content ?? {}) as { en?: LocalePreview; fa?: LocalePreview };
  return {
    en: c.en?.text?.trim() || "Untitled question",
    fa: c.fa?.text?.trim() || "",
  };
}

const TYPE_VALUES = [
  "TEXT",
  "IMAGE",
  "CAREER_PATH",
  "HIGHER_LOWER",
  "REVEAL_IMAGE",
] as const;
type QuestionType = (typeof TYPE_VALUES)[number];

type SearchParams = {
  category?: string;
  tag?: string;
  q?: string;
  status?: string;
  type?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

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

function parseStatus(raw: string | undefined): QuestionStatus | undefined {
  if (!raw) return undefined;
  return STATUS_VALUES.includes(raw as QuestionStatus)
    ? (raw as QuestionStatus)
    : undefined;
}

function parseType(raw: string | undefined): QuestionType | undefined {
  if (!raw) return undefined;
  return TYPE_VALUES.includes(raw as QuestionType)
    ? (raw as QuestionType)
    : undefined;
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { category, tag } = sp;
  const status = parseStatus(sp.status);
  const type = parseType(sp.type);
  const q = sp.q?.trim() || "";
  const sort = sp.sort;
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.QuestionWhereInput = {
    ...(category ? { categoryId: category } : {}),
    ...(tag ? { tags: { some: { id: tag } } } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
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

  const [total, publishedCount, categories, tags] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.count({ where: { status: "PUBLISHED" } }),
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

  const isFiltered = Boolean(category || tag || q || status || type);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Questions
            <AdminHelpTip
              wide
              title="Question bank"
              text="Only Published questions are drawn into Penalty, Quick, Survival, and Duel. Use Draft while writing, then Publish when ready."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {total.toLocaleString("en-US")} shown
            {isFiltered ? " (filtered)" : ""}
            {" · "}
            {publishedCount.toLocaleString("en-US")} live in matches
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">
              <ArrowDownUp className="h-4 w-4" />
              Import / Export
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/questions/new">
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>
      </div>

      <AdminHowItWorks
        title="How the question bank works"
        steps={[
          "Write EN + FA text (and options) on the Create / Edit form.",
          "Assign a category and difficulty so matchmaking can pick fairly.",
          "Set status to Published — only then can the question appear in a match.",
        ]}
      />

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
              Search
              <AdminHelpTip
                title="Full-text search"
                text="Matches English or Persian prompt text. Filters reset to page 1."
              />
            </p>
            <QuestionSearch />
          </div>
          <QuestionFilters
            categories={categories}
            tags={tags}
            category={category}
            tag={tag}
            status={status}
            type={type}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50/90 hover:bg-slate-50/90">
              <TableHead className="ps-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
              <TableHead className="pe-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-slate-700">
                      {isFiltered ? "No matches" : "Bank is empty"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isFiltered
                        ? "Try clearing search or filters."
                        : "Create a question to start filling Match Day."}
                    </p>
                    {!isFiltered && (
                      <Button asChild size="sm" className="mt-2">
                        <Link href="/admin/questions/new">
                          <Plus className="h-4 w-4" />
                          Create question
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question) => {
                const preview = questionPreview(question.content);
                return (
                  <TableRow
                    key={question.id}
                    className="group border-slate-100 hover:bg-slate-50/70"
                  >
                    <TableCell className="max-w-md py-3.5 ps-4">
                      <Link
                        href={`/admin/questions/${question.id}/edit`}
                        className="flex items-start gap-2.5"
                      >
                        <TypeBadge type={question.type} />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="line-clamp-2 font-medium leading-snug text-slate-800 group-hover:text-slate-950 group-hover:underline">
                            {preview.en}
                          </span>
                          {preview.fa ? (
                            <span
                              dir="rtl"
                              className="line-clamp-1 text-xs text-slate-400"
                              title={preview.fa}
                            >
                              {preview.fa}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {question.category ? (
                        <span
                          className="text-sm font-medium text-slate-700"
                          title={question.category.nameFa}
                        >
                          {question.category.nameEn}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {question.tags.length ? (
                        <div className="flex max-w-[8rem] flex-wrap gap-1">
                          {question.tags.slice(0, 2).map((t) => (
                            <span
                              key={t.slug}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                              {t.slug}
                            </span>
                          ))}
                          {question.tags.length > 2 && (
                            <span className="text-[11px] text-slate-400">
                              +{question.tags.length - 2}
                            </span>
                          )}
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
                    <TableCell className="pe-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-slate-600"
                        >
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
