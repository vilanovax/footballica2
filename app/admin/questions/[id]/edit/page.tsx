import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "@/components/admin/QuestionForm";
import type { QuestionFormValues } from "@/lib/admin/questionSchema";

export const dynamic = "force-dynamic";

type StoredLocale = { text?: string; options?: unknown };

/** Coerce a stored options blob into exactly four strings. */
function toFourOptions(raw: unknown): [string, string, string, string] {
  const arr = Array.isArray(raw) ? raw : [];
  return [0, 1, 2, 3].map((i) => String(arr[i] ?? "")) as [
    string,
    string,
    string,
    string,
  ];
}

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [question, categories, tags] = await Promise.all([
    prisma.question.findUnique({
      where: { id },
      include: { tags: { select: { id: true } } },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
    prisma.tag.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
  ]);

  if (!question) notFound();

  const content = (question.content ?? {}) as {
    en?: StoredLocale;
    fa?: StoredLocale;
  };

  const explanationRaw = (question.explanation ?? {}) as {
    en?: string;
    fa?: string;
  };

  const initialValues: QuestionFormValues = {
    type: question.type,
    mediaUrl: question.mediaUrl ?? "",
    categoryId: question.categoryId ?? "",
    difficulty: question.difficulty,
    correctIndex: question.correctIndex,
    status: question.status,
    isTemporal: question.isTemporal,
    // <input type="date"> wants YYYY-MM-DD; "" means "no date".
    asOfDate: question.asOfDate
      ? question.asOfDate.toISOString().slice(0, 10)
      : "",
    source: question.source ?? "",
    tagIds: question.tags.map((t) => t.id),
    content: {
      en: {
        text: content.en?.text ?? "",
        options: toFourOptions(content.en?.options),
      },
      fa: {
        text: content.fa?.text ?? "",
        options: toFourOptions(content.fa?.options),
      },
    },
    explanation: {
      en: explanationRaw.en ?? "",
      fa: explanationRaw.fa ?? "",
    },
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/questions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to questions
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">Edit question</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {question.id}
        </p>
      </div>

      <QuestionForm
        categories={categories}
        tags={tags}
        questionId={question.id}
        initialValues={initialValues}
      />
    </div>
  );
}
