"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileJson,
  Copy,
  Check,
  ClipboardPaste,
  Sparkles,
  AlertCircle,
  Pencil,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { exportQuestions, importQuestions } from "@/actions/admin/io";
import {
  importPayloadSchema,
  type ImportQuestion,
} from "@/lib/admin/questionSchema";
import {
  AI_QUESTION_EXTRACT_PROMPT,
  sampleImportJsonString,
} from "@/lib/admin/importSample";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Category = { id: string; nameEn: string; nameFa: string; _count: number };

const ALL = "all";
const SAMPLE_JSON = sampleImportJsonString();

type DraftRow =
  | { id: string; ok: true; q: ImportQuestion }
  | { id: string; ok: false; error: string };

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractQuestionsRaw(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { questions?: unknown }).questions)
  ) {
    return (json as { questions: unknown[] }).questions;
  }
  return [];
}

function parseToDraft(json: unknown): DraftRow[] {
  const rawList = extractQuestionsRaw(json);
  if (rawList.length === 0) return [];

  return rawList.map((raw) => {
    const asArray = importPayloadSchema.safeParse([raw]);
    if (asArray.success) {
      const q = Array.isArray(asArray.data)
        ? asArray.data[0]!
        : asArray.data.questions[0]!;
      return { id: newId(), ok: true as const, q };
    }
    const asWrapped = importPayloadSchema.safeParse({ questions: [raw] });
    if (asWrapped.success) {
      const q = Array.isArray(asWrapped.data)
        ? asWrapped.data[0]!
        : asWrapped.data.questions[0]!;
      return { id: newId(), ok: true as const, q };
    }
    const msg =
      asArray.error.issues[0]?.message ??
      asWrapped.error.issues[0]?.message ??
      "Invalid question";
    return { id: newId(), ok: false as const, error: msg };
  });
}

async function copyText(text: string, okMsg: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMsg);
  } catch {
    toast.error("Could not copy — select the text manually.");
  }
}

export function ImportExportPanel({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exportCat, setExportCat] = useState<string>(ALL);
  const [exporting, startExport] = useTransition();

  // Empty until the admin explicitly picks a category.
  const [importCat, setImportCat] = useState<string>("");
  const [tags, setTags] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedCategory = categories.find((c) => c.id === importCat) ?? null;
  const validRows = draft.filter((r): r is Extract<DraftRow, { ok: true }> => r.ok);
  const invalidCount = draft.length - validRows.length;
  const allValid = draft.length > 0 && invalidCount === 0;
  const categoryReady = Boolean(importCat && selectedCategory);

  const canOpenConfirm = allValid && categoryReady && !importing;

  const step = useMemo(() => {
    if (!draft.length) return 1;
    if (!allValid || !categoryReady) return 2;
    return 3;
  }, [draft.length, allValid, categoryReady]);

  function clearDraft() {
    setDraft([]);
    setJsonText("");
    setFileName(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function ingestJson(text: string, name?: string | null) {
    setJsonText(text);
    setFileName(name ?? null);
    setParseError(null);
    if (!text.trim()) {
      setDraft([]);
      return;
    }
    try {
      const json = JSON.parse(text);
      const rows = parseToDraft(json);
      if (rows.length === 0) {
        setDraft([]);
        setParseError("No questions found in that JSON.");
        toast.error("No questions found in that JSON.");
        return;
      }
      setDraft(rows);
      const bad = rows.filter((r) => !r.ok).length;
      if (bad === 0) {
        toast.success(`${rows.length} question(s) ready to review`);
      } else {
        toast.message(`${rows.length - bad}/${rows.length} valid — fix or remove red rows`);
      }
    } catch {
      setDraft([]);
      setParseError("JSON parse error — fix syntax first.");
      toast.error("Could not parse JSON.");
    }
  }

  function handleExport() {
    startExport(async () => {
      const res = await exportQuestions(exportCat === ALL ? undefined : exportCat);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([JSON.stringify(res.bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const scope = res.bundle.category?.slug ?? "all";
      a.download = `footballica-questions-${scope}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.bundle.count} question(s).`);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      ingestJson(text, file.name);
    } catch {
      toast.error("Could not read file.");
      clearDraft();
    }
  }

  function deleteRow(id: string) {
    setDraft((prev) => prev.filter((r) => r.id !== id));
    toast.message("Removed from import batch");
  }

  function saveEdit(id: string, next: ImportQuestion) {
    const check = importPayloadSchema.safeParse([next]);
    if (!check.success) {
      toast.error(check.error.issues[0]?.message ?? "Invalid question");
      return false;
    }
    const q = Array.isArray(check.data)
      ? check.data[0]!
      : check.data.questions[0]!;
    setDraft((prev) =>
      prev.map((r) => (r.id === id ? { id, ok: true as const, q } : r)),
    );
    setEditId(null);
    toast.success("Question updated in preview");
    return true;
  }

  function requestConfirm() {
    if (!categoryReady) {
      toast.error("Select a target category first.");
      return;
    }
    if (!allValid) {
      toast.error("Fix or delete invalid questions first.");
      return;
    }
    setConfirmOpen(true);
  }

  function runImport() {
    if (!canOpenConfirm || !selectedCategory) return;
    const payload = { version: 1, questions: validRows.map((r) => r.q) };
    startImport(async () => {
      const res = await importQuestions({
        categoryId: importCat,
        globalTags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        payload,
      });
      if (res.ok) {
        toast.success(`Imported ${res.created} into ${selectedCategory.nameEn}`);
        setConfirmOpen(false);
        clearDraft();
        setTags("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  async function handleCopyPrompt() {
    await copyText(AI_QUESTION_EXTRACT_PROMPT, "AI prompt copied");
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 2000);
  }

  const editingRow = editId
    ? draft.find((r): r is Extract<DraftRow, { ok: true }> => r.id === editId && r.ok)
    : null;

  return (
    <div className="space-y-5">
      {/* Steps */}
      <ol className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 text-center text-[11px] font-semibold">
        {[
          { n: 1, label: "Load JSON" },
          { n: 2, label: "Review · Edit" },
          { n: 3, label: "Confirm" },
        ].map((s) => (
          <li
            key={s.n}
            className={[
              "rounded-xl px-2 py-2",
              step === s.n
                ? "bg-slate-900 text-white"
                : step > s.n
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-slate-50 text-slate-400",
            ].join(" ")}
          >
            {s.n}. {s.label}
          </li>
        ))}
      </ol>

      {/* AI brief */}
      <Card className="border-violet-200 bg-violet-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-violet-600" />
            AI extract → Import
          </CardTitle>
          <CardDescription className="text-xs">
            Copy prompt → AI JSON → load → edit/delete in preview → confirm
            into the chosen category.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="bg-white"
            onClick={() => void handleCopyPrompt()}
          >
            {copiedPrompt ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiedPrompt ? "Copied" : "Copy AI prompt"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="bg-white"
            onClick={() => ingestJson(SAMPLE_JSON, "sample-import.json")}
          >
            <FileJson className="h-3.5 w-3.5" />
            Load sample JSON
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="bg-white"
            onClick={() => void copyText(SAMPLE_JSON, "Sample JSON copied")}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy sample
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" />
                Backup
              </CardTitle>
              <CardDescription className="text-xs">
                Download the bank (or one category) as JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1 space-y-1">
                <Label className="text-[11px] text-slate-500">Scope</Label>
                <Select value={exportCat} onValueChange={setExportCat}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nameEn} ({c._count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="h-9"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "…" : "Download"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                1 · Setup
              </CardTitle>
              <CardDescription className="text-xs">
                Category is required. Nothing writes until you confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">
                    Target category <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={importCat || undefined} onValueChange={setImportCat}>
                    <SelectTrigger
                      className={[
                        "h-9",
                        !importCat ? "border-amber-300 ring-1 ring-amber-200" : "",
                      ].join(" ")}
                    >
                      <SelectValue placeholder="Select category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nameEn} · {c.nameFa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!importCat && (
                    <p className="text-[11px] text-amber-700">
                      Pick the category these questions belong to.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">
                    Extra tags (optional)
                  </Label>
                  <Input
                    className="h-9"
                    placeholder="nostalgia, derby"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">
                  JSON (paste or file)
                </Label>
                <textarea
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setFileName(null);
                  }}
                  spellCheck={false}
                  rows={8}
                  placeholder='{ "questions": [ … ] }'
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  dir="ltr"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    onClick={() => ingestJson(jsonText, fileName)}
                    disabled={!jsonText.trim()}
                  >
                    Parse → Preview
                  </Button>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => void handleFile(e)}
                    className="h-9 max-w-xs cursor-pointer text-xs file:me-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1"
                  />
                  {fileName && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <FileJson className="h-3.5 w-3.5" />
                      {fileName}
                    </span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        ingestJson(text, "clipboard");
                      } catch {
                        toast.error("Clipboard blocked — paste into the box.");
                      }
                    }}
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    Paste
                  </Button>
                  {draft.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-rose-600"
                      onClick={clearDraft}
                    >
                      Clear batch
                    </Button>
                  )}
                </div>
                {parseError && (
                  <p className="flex items-center gap-1 text-xs text-rose-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {parseError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <Button
                  onClick={requestConfirm}
                  disabled={!canOpenConfirm}
                  size="sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Review & confirm import…
                </Button>
                {draft.length > 0 && (
                  <span
                    className={[
                      "text-xs font-semibold",
                      allValid && categoryReady
                        ? "text-emerald-700"
                        : "text-amber-700",
                    ].join(" ")}
                  >
                    {validRows.length}/{draft.length} valid
                    {!categoryReady ? " · category required" : ""}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card className="min-h-112">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">2 · Preview</CardTitle>
            <CardDescription className="text-xs">
              Edit or delete before confirm. Green option = correct answer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {draft.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                <FileJson className="h-8 w-8 text-slate-300" />
                Load sample or paste AI JSON, then Parse → Preview.
              </div>
            ) : (
              <ul className="flex max-h-136 flex-col gap-2.5 overflow-y-auto pe-1">
                {draft.map((item, index) =>
                  item.ok ? (
                    <QuestionPreviewCard
                      key={item.id}
                      index={index}
                      q={item.q}
                      onEdit={() => setEditId(item.id)}
                      onDelete={() => deleteRow(item.id)}
                    />
                  ) : (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
                    >
                      <span className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          <strong>#{index + 1}</strong> — {item.error}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 text-rose-700"
                        onClick={() => deleteRow(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sample on page */}
      <Card className="border-slate-200 bg-slate-50/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sample JSON (import format)</CardTitle>
          <CardDescription className="text-xs">
            Give this shape to an AI, or click{" "}
            <strong>Load sample JSON</strong> above to try the flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">
            {SAMPLE_JSON}
          </pre>
          <details className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">
              Full AI prompt (expand)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
              {AI_QUESTION_EXTRACT_PROMPT}
            </pre>
          </details>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={Boolean(editingRow)} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
            <DialogDescription>
              Changes apply to this import batch only — nothing is saved until
              you confirm import.
            </DialogDescription>
          </DialogHeader>
          {editingRow && (
            <EditQuestionForm
              initial={editingRow.q}
              onCancel={() => setEditId(null)}
              onSave={(q) => saveEdit(editingRow.id, q)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Confirm import
            </DialogTitle>
            <DialogDescription>
              This will create questions in the database. Double-check the
              category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Questions</span>
              <span className="font-bold text-slate-900">{validRows.length}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Category</span>
              <span className="text-end font-bold text-slate-900">
                {selectedCategory
                  ? `${selectedCategory.nameEn} · ${selectedCategory.nameFa}`
                  : "—"}
              </span>
            </div>
            {tags.trim() && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Extra tags</span>
                <span className="text-end font-medium text-slate-800">
                  {tags}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={runImport}
              disabled={importing || !canOpenConfirm}
            >
              <Upload className="h-4 w-4" />
              {importing ? "Importing…" : `Import ${validRows.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionPreviewCard({
  index,
  q,
  onEdit,
  onDelete,
}: {
  index: number;
  q: ImportQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            #{index + 1}
          </span>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">
            {q.type}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            {q.difficulty}
          </span>
          {q.tags?.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500"
            >
              #{t}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-rose-600 hover:text-rose-700"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-900">{q.content.en.text}</p>
      <p className="mt-0.5 text-sm text-slate-600" dir="rtl">
        {q.content.fa.text}
      </p>
      <ol className="mt-2 grid gap-1 sm:grid-cols-2">
        {q.content.en.options.map((opt, i) => {
          const correct = i === q.correctIndex;
          return (
            <li
              key={i}
              className={[
                "rounded-lg border px-2 py-1.5 text-[11px]",
                correct
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-100 bg-slate-50 text-slate-600",
              ].join(" ")}
            >
              <span className="font-bold text-slate-400">{i + 1}.</span> {opt}
              <span className="mt-0.5 block text-slate-500" dir="rtl">
                {q.content.fa.options[i]}
              </span>
            </li>
          );
        })}
      </ol>
    </li>
  );
}

function EditQuestionForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: ImportQuestion;
  onCancel: () => void;
  onSave: (q: ImportQuestion) => boolean;
}) {
  const [difficulty, setDifficulty] = useState(initial.difficulty);
  const [correctIndex, setCorrectIndex] = useState(String(initial.correctIndex));
  const [enText, setEnText] = useState(initial.content.en.text);
  const [faText, setFaText] = useState(initial.content.fa.text);
  const [enOpts, setEnOpts] = useState([...initial.content.en.options]);
  const [faOpts, setFaOpts] = useState([...initial.content.fa.options]);
  const [expEn, setExpEn] = useState(initial.explanation?.en ?? "");
  const [expFa, setExpFa] = useState(initial.explanation?.fa ?? "");
  const [tagStr, setTagStr] = useState((initial.tags ?? []).join(", "));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: ImportQuestion = {
      ...initial,
      difficulty,
      correctIndex: Number(correctIndex),
      content: {
        en: {
          ...initial.content.en,
          text: enText,
          options: enOpts.map((o) => o.trim()) as [string, string, string, string],
        },
        fa: {
          ...initial.content.fa,
          text: faText,
          options: faOpts.map((o) => o.trim()) as [string, string, string, string],
        },
      },
      explanation:
        expEn.trim() || expFa.trim()
          ? { en: expEn, fa: expFa }
          : initial.explanation ?? null,
      tags: tagStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    onSave(next);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Difficulty</Label>
          <Select
            value={difficulty}
            onValueChange={(v) =>
              setDifficulty(v as ImportQuestion["difficulty"])
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EASY">EASY</SelectItem>
              <SelectItem value="MEDIUM">MEDIUM</SelectItem>
              <SelectItem value="HARD">HARD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Correct option (1–4)</Label>
          <Select value={correctIndex} onValueChange={setCorrectIndex}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map((i) => (
                <SelectItem key={i} value={String(i)}>
                  Option {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">EN question</Label>
        <Input value={enText} onChange={(e) => setEnText(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">FA question</Label>
        <Input
          value={faText}
          onChange={(e) => setFaText(e.target.value)}
          dir="rtl"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1 rounded-lg border border-slate-100 p-2">
            <Label className="text-[10px] text-slate-500">Option {i + 1}</Label>
            <Input
              className="h-8 text-xs"
              value={enOpts[i] ?? ""}
              onChange={(e) => {
                const next = [...enOpts];
                next[i] = e.target.value;
                setEnOpts(next);
              }}
              placeholder="EN"
            />
            <Input
              className="h-8 text-xs"
              value={faOpts[i] ?? ""}
              onChange={(e) => {
                const next = [...faOpts];
                next[i] = e.target.value;
                setFaOpts(next);
              }}
              placeholder="FA"
              dir="rtl"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Explanation EN</Label>
          <Input value={expEn} onChange={(e) => setExpEn(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Explanation FA</Label>
          <Input
            value={expFa}
            onChange={(e) => setExpFa(e.target.value)}
            dir="rtl"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Tags (comma-separated)</Label>
        <Input value={tagStr} onChange={(e) => setTagStr(e.target.value)} />
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save in preview</Button>
      </DialogFooter>
    </form>
  );
}
