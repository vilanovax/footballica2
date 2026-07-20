import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ImportExportPanel } from "@/components/admin/ImportExportPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const categories = await prisma.category.findMany({
    orderBy: { nameEn: "asc" },
    select: {
      id: true,
      nameEn: true,
      nameFa: true,
      _count: { select: { questions: true } },
    },
  });

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
          Backup, restore, and bulk-manage the question bank.
        </p>
      </div>

      <ImportExportPanel categories={options} />

      <Card className="border-slate-200 bg-slate-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" />
            JSON format
          </CardTitle>
          <CardDescription>
            Import accepts either a bare array of questions or a{" "}
            <code className="rounded bg-slate-200 px-1">
              {"{ questions: [...] }"}
            </code>{" "}
            wrapper (exactly what &ldquo;Backup&rdquo; produces). Each question:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
            {`{
  "type": "TEXT",
  "difficulty": "EASY",
  "correctIndex": 1,
  "content": {
    "en": { "text": "…", "options": ["A", "B", "C", "D"] },
    "fa": { "text": "…", "options": ["الف", "ب", "ج", "د"] }
  },
  "tags": ["nostalgia"]
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
