import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { emptyQuestionForm } from "@/lib/admin/questionSchema";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    select: { id: true, nameEn: true, nameFa: true },
  });

  const initialValues = {
    ...emptyQuestionForm,
    categoryId: categories[0]?.id ?? "",
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
        <h1 className="text-xl font-semibold text-slate-900">New question</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a bilingual question to the bank.
        </p>
      </div>

      <QuestionForm categories={categories} initialValues={initialValues} />
    </div>
  );
}
