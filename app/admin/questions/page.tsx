import Link from "next/link";
import {
  Plus,
  Pencil,
  ArrowDownUp,
  BookOpen,
  Radio,
  ListChecks,
} from "lucide-react";
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
import { inCategoryWhere } from "@/lib/quiz/inCategory";
import { cn } from "@/lib/utils";

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

const DIFFICULTY_VALUES = ["EASY", "MEDIUM", "HARD"] as const;
type QuestionDifficulty = (typeof DIFFICULTY_VALUES)[number];

type SearchParams = {
  category?: string;
  tag?: string;
  q?: string;
  status?: string;
  type?: string;
  difficulty?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function buildOrderBy(
  sort: string | undefined,
  dir: "asc" | "desc",
): Prisma.QuestionOrderByWithRelationInput[] {
  switch (sort) {
    case "question":
    case "type":
      return [{ type: dir }, { createdAt: "desc" }];
    case "category":
      return [{ category: { nameEn: dir } }, { createdAt: "desc" }];
    case "tags":
      return [{ tags: { _count: dir } }, { createdAt: "desc" }];
    case "difficulty":
      return [{ difficulty: dir }, { createdAt: "desc" }];
    case "status":
      return [{ status: dir }, { createdAt: "desc" }];
    case "created":
      return [{ createdAt: dir }];
    default:
      return [{ createdAt: "desc" }];
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

function parseDifficulty(
  raw: string | undefined,
): QuestionDifficulty | undefined {
  if (!raw) return undefined;
  return DIFFICULTY_VALUES.includes(raw as QuestionDifficulty)
    ? (raw as QuestionDifficulty)
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
  const difficulty = parseDifficulty(sp.difficulty);
  const q = sp.q?.trim() || "";
  const sort = sp.sort;
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const filters: Prisma.QuestionWhereInput[] = [];
  if (category) filters.push(inCategoryWhere(category));
  if (tag) filters.push({ tags: { some: { id: tag } } });
  if (status) filters.push({ status });
  if (type) filters.push({ type });
  if (difficulty) filters.push({ difficulty });
  if (q) {
    filters.push({
      OR: [
        { content: { path: ["en", "text"], string_contains: q } },
        { content: { path: ["fa", "text"], string_contains: q } },
      ],
    });
  }
  const where: Prisma.QuestionWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  const orderBy = buildOrderBy(sort, dir);

  const [total, publishedCount, draftCount, reviewCount, categories, tags] =
    await Promise.all([
      prisma.question.count({ where }),
      prisma.question.count({ where: { status: "PUBLISHED" } }),
      prisma.question.count({ where: { status: "DRAFT" } }),
      prisma.question.count({ where: { status: "IN_REVIEW" } }),
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
      createdAt: true,
      category: { select: { nameEn: true, nameFa: true } },
      tags: { select: { slug: true } },
    },
  });

  const isFiltered = Boolean(
    category || tag || q || status || type || difficulty,
  );
  const pipeline = publishedCount + draftCount + reviewCount;
  const livePct =
    !isFiltered && pipeline > 0
      ? Math.round((publishedCount / pipeline) * 100)
      : null;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm sm:px-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                <ListChecks className="h-3 w-3" strokeWidth={2.5} />
                Question bank
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">
                <Radio className="h-3 w-3" />
                {publishedCount.toLocaleString("en-US")} live
              </span>
            </div>
            <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
              Questions
              <AdminHelpTip
                wide
                title="Question bank"
                text="Only Published questions are drawn into Penalty, Quick, Survival, and Duel. Use Draft while writing, then Publish when ready."
              />
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-400">
              {total.toLocaleString("en-US")} shown
              {isFiltered ? " · filtered" : ""}
              {" · "}
              {publishedCount.toLocaleString("en-US")} live in matches
              {draftCount + reviewCount > 0
                ? ` · ${draftCount + reviewCount} in pipeline`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            >
              <Link href="/admin/settings">
                <ArrowDownUp className="h-4 w-4" />
                Import / Export
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-emerald-500 text-white hover:bg-emerald-400"
            >
              <Link href="/admin/questions/new">
                <Plus className="h-4 w-4" />
                Create
              </Link>
            </Button>
          </div>
        </div>

        {/* Mini status strip */}
        <div className="relative mt-3 grid grid-cols-3 gap-2 sm:max-w-md">
          <StatPill
            label="Published"
            value={publishedCount}
            tone="emerald"
          />
          <StatPill label="Draft" value={draftCount} tone="slate" />
          <StatPill label="In review" value={reviewCount} tone="amber" />
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
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Search & filters
          </p>
          {livePct != null ? (
            <p className="text-[11px] font-semibold text-slate-400">
              Bank health · {livePct}% published share of active pipeline
            </p>
          ) : null}
        </header>
        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="w-full lg:max-w-lg">
            <QuestionSearch />
          </div>
          <QuestionFilters
            categories={categories}
            tags={tags}
            category={category}
            tag={tag}
            status={status}
            type={type}
            difficulty={difficulty}
          />
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/90 hover:bg-slate-50/90">
                <TableHead className="sticky top-0 z-[1] bg-slate-50/95 ps-4 backdrop-blur">
                  <SortableHeader label="Question" sortKey="type" />
                </TableHead>
                <TableHead className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur">
                  <SortableHeader label="Category" sortKey="category" />
                </TableHead>
                <TableHead className="sticky top-0 z-[1] hidden bg-slate-50/95 backdrop-blur md:table-cell">
                  <SortableHeader label="Tags" sortKey="tags" />
                </TableHead>
                <TableHead className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur">
                  <SortableHeader label="Difficulty" sortKey="difficulty" />
                </TableHead>
                <TableHead className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur">
                  <SortableHeader label="Status" sortKey="status" />
                </TableHead>
                <TableHead className="sticky top-0 z-[1] hidden bg-slate-50/95 backdrop-blur sm:table-cell">
                  <SortableHeader label="Created" sortKey="created" />
                </TableHead>
                <TableHead className="sticky top-0 z-[1] bg-slate-50/95 pe-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-semibold text-slate-800">
                        {isFiltered ? "No matches" : "Bank is empty"}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
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
                      className="group border-slate-100 hover:bg-sky-50/40"
                    >
                      <TableCell className="max-w-md py-2.5 ps-4">
                        <Link
                          href={`/admin/questions/${question.id}/edit`}
                          className="flex items-start gap-2.5"
                        >
                          <TypeBadge type={question.type} />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span
                              className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 group-hover:text-slate-950 group-hover:underline"
                              title={
                                preview.fa
                                  ? `${preview.en}\n${preview.fa}`
                                  : preview.en
                              }
                            >
                              {preview.en}
                            </span>
                            {preview.fa ? (
                              <span
                                dir="rtl"
                                className="line-clamp-1 text-[11px] text-slate-400 opacity-80 transition-opacity group-hover:opacity-100"
                              >
                                {preview.fa}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {question.category ? (
                          <span
                            className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-100"
                            title={question.category.nameFa}
                          >
                            {question.category.nameEn}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-2.5 md:table-cell">
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
                              <span className="text-[11px] font-semibold text-slate-400">
                                +{question.tags.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <DifficultyBadge difficulty={question.difficulty} />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <QuestionStatusBadge status={question.status} />
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap py-2.5 text-xs font-medium text-slate-500 sm:table-cell">
                        {question.createdAt.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="py-2.5 pe-4 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 text-slate-600"
                          >
                            <Link
                              href={`/admin/questions/${question.id}/edit`}
                            >
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
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </section>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "slate" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-2.5 py-1.5 ring-1",
        tone === "emerald" && "bg-emerald-400/10 ring-emerald-400/25",
        tone === "amber" && "bg-amber-400/10 ring-amber-400/25",
        tone === "slate" && "bg-white/5 ring-white/10",
      )}
    >
      <p className="text-sm font-bold tabular-nums text-white">
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}
