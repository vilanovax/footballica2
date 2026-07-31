"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  exportQuestions,
  importQuestions,
  previewImportQuestions,
} from "@/actions/admin/io";
import {
  importPayloadSchema,
  type ImportQuestion,
} from "@/lib/admin/questionSchema";
import type { TriageItem, TriageKind } from "@/lib/admin/importTriage";
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

  const [importCat, setImportCat] = useState<string>("");
  const [tags, setTags] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [triage, setTriage] = useState<TriageItem[]>([]);
  const [triagePending, startTriage] = useTransition();

  const selectedCategory = categories.find((c) => c.id === importCat) ?? null;
  const validRows = draft.filter(
    (r): r is Extract<DraftRow, { ok: true }> => r.ok,
  );
  const invalidCount = draft.length - validRows.length;
  const allValid = draft.length > 0 && invalidCount === 0;
  const categoryReady = Boolean(importCat && selectedCategory);
  const canOpenConfirm =
    allValid && categoryReady && !importing && !triagePending;

  /** Map triage rows (indexed by valid payload order) back to draft row ids. */
  const triageByDraftId = useMemo(() => {
    const map = new Map<string, TriageItem>();
    validRows.forEach((row, i) => {
      const item = triage.find((t) => t.index === i);
      if (item) map.set(row.id, item);
    });
    return map;
  }, [triage, validRows]);

  const triageSummary = useMemo(() => {
    let neu = 0;
    let attach = 0;
    let skip = 0;
    for (const t of triage) {
      if (t.kind === "new") neu += 1;
      else if (t.kind === "duplicate_attach") attach += 1;
      else skip += 1;
    }
    return { neu, attach, skip };
  }, [triage]);

  const step = useMemo(() => {
    if (!draft.length) return 1;
    if (!allValid || !categoryReady) return 2;
    return 3;
  }, [draft.length, allValid, categoryReady]);

  // Re-run L1 dedupe whenever batch / category / global tags change.
  useEffect(() => {
    if (!importCat || validRows.length === 0 || invalidCount > 0) {
      setTriage([]);
      return;
    }
    const payload = { version: 1, questions: validRows.map((r) => r.q) };
    const globalTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    startTriage(async () => {
      const res = await previewImportQuestions({
        categoryId: importCat,
        globalTags,
        payload,
      });
      if (res.ok) setTriage(res.items);
      else {
        setTriage([]);
        toast.error(res.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft identity via validRows content
  }, [importCat, tags, draft, invalidCount]);

  function clearDraft() {
    setDraft([]);
    setTriage([]);
    setJsonText("");
    setFileName(null);
    setParseError(null);
    setShowJsonEditor(true);
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
      setShowJsonEditor(false);
      const bad = rows.filter((r) => !r.ok).length;
      if (bad === 0) {
        toast.success(`${rows.length} question(s) ready to review`);
      } else {
        toast.message(
          `${rows.length - bad}/${rows.length} valid — fix or remove red rows`,
        );
      }
    } catch {
      setDraft([]);
      setParseError("JSON parse error — fix syntax first.");
      toast.error("Could not parse JSON.");
    }
  }

  function handleExport() {
    startExport(async () => {
      const res = await exportQuestions(
        exportCat === ALL ? undefined : exportCat,
      );
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
    setDraft((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) setShowJsonEditor(true);
      return next;
    });
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
        toast.success(
          `Done: ${res.created} new · ${res.attached} attached · ${res.skipped} skipped → ${selectedCategory.nameEn}`,
        );
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
    ? draft.find(
        (r): r is Extract<DraftRow, { ok: true }> => r.id === editId && r.ok,
      )
    : null;

  const steps = [
    { n: 1, label: "Load" },
    { n: 2, label: "Review" },
    { n: 3, label: "Confirm" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Compact backup strip — secondary job */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Download className="h-3.5 w-3.5 text-slate-400" />
          Backup
        </div>
        <Select value={exportCat} onValueChange={setExportCat}>
          <SelectTrigger className="h-8 w-44 text-xs">
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
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "…" : "Download JSON"}
        </Button>
      </div>

      {/* Hero: one import workspace */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="space-y-3 border-b border-slate-100 bg-linear-to-br from-slate-50 to-white pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4 text-emerald-600" />
                Import questions
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Category → JSON → edit preview → confirm. Nothing writes early.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 bg-white text-xs"
                onClick={() => void handleCopyPrompt()}
              >
                {copiedPrompt ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {copiedPrompt ? "Prompt copied" : "AI prompt"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 bg-white text-xs"
                onClick={() => void copyText(SAMPLE_JSON, "Sample copied")}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy sample
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={() => ingestJson(SAMPLE_JSON, "sample-import.json")}
              >
                <FileJson className="h-3.5 w-3.5" />
                Try sample
              </Button>
            </div>
          </div>

          {/* Connected stepper */}
          <ol className="flex items-center gap-0">
            {steps.map((s, i) => {
              const done = step > s.n;
              const active = step === s.n;
              return (
                <li key={s.n} className="flex flex-1 items-center">
                  <div
                    className={[
                      "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors",
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : done
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100/80 text-slate-400",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        active
                          ? "bg-white/20 text-white"
                          : done
                            ? "bg-emerald-200 text-emerald-900"
                            : "bg-white text-slate-400",
                      ].join(" ")}
                    >
                      {done ? "✓" : s.n}
                    </span>
                    {s.label}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={[
                        "mx-1 h-0.5 w-3 shrink-0 rounded-full sm:w-5",
                        step > s.n ? "bg-emerald-300" : "bg-slate-200",
                      ].join(" ")}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[minmax(0,22rem)_1fr]">
            {/* Left rail: destination + source */}
            <div className="space-y-4 border-b border-slate-100 p-4 lg:border-b-0 lg:border-e">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Destination <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={importCat || undefined}
                  onValueChange={setImportCat}
                >
                  <SelectTrigger
                    className={[
                      "h-10",
                      !importCat
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-emerald-200 bg-emerald-50/30",
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
                {selectedCategory ? (
                  <p className="text-[11px] font-medium text-emerald-700">
                    → {selectedCategory.nameEn}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-700">
                    Required before confirm
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Extra tags
                </Label>
                <Input
                  className="h-9"
                  placeholder="nostalgia, derby"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Source JSON
                  </Label>
                  {draft.length > 0 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                      onClick={() => setShowJsonEditor((v) => !v)}
                    >
                      <ChevronDown
                        className={[
                          "h-3.5 w-3.5 transition-transform",
                          showJsonEditor ? "rotate-180" : "",
                        ].join(" ")}
                      />
                      {showJsonEditor ? "Hide editor" : "Show editor"}
                    </button>
                  )}
                </div>

                {showJsonEditor && (
                  <textarea
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value);
                      setFileName(null);
                    }}
                    spellCheck={false}
                    rows={7}
                    placeholder='Paste AI output: { "questions": […] }'
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-950 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    dir="ltr"
                  />
                )}

                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={() => ingestJson(jsonText, fileName)}
                    disabled={!jsonText.trim()}
                  >
                    Parse → Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
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
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5" />
                    File
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => void handleFile(e)}
                    />
                  </label>
                  {draft.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-rose-600"
                      onClick={clearDraft}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {fileName && (
                  <p className="flex items-center gap-1 text-[11px] text-slate-500">
                    <FileJson className="h-3.5 w-3.5" />
                    {fileName}
                  </p>
                )}
                {parseError && (
                  <p className="flex items-center gap-1 text-xs text-rose-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {parseError}
                  </p>
                )}
              </div>
            </div>

            {/* Right: preview stage */}
            <div className="flex min-h-80 flex-col bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white/80 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Preview
                  </p>
                  <p className="text-[11px] text-slate-500">
                    L1 dedupe by contentHash · green option = correct
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {triagePending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                  {draft.length > 0 && categoryReady && triage.length > 0 && (
                    <>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {triageSummary.neu} new
                      </span>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                        {triageSummary.attach} attach
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {triageSummary.skip} skip
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-3">
                {draft.length === 0 ? (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                      <FileJson className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        No questions yet
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-slate-500">
                        Paste AI JSON on the left, or load the sample to see the
                        full review flow.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        ingestJson(SAMPLE_JSON, "sample-import.json")
                      }
                    >
                      <FileJson className="h-3.5 w-3.5" />
                      Load sample batch
                    </Button>
                  </div>
                ) : (
                  <ul className="flex max-h-112 flex-col gap-2 overflow-y-auto pe-1">
                    {draft.map((item, index) =>
                      item.ok ? (
                        <QuestionPreviewCard
                          key={item.id}
                          index={index}
                          q={item.q}
                          triage={
                            categoryReady
                              ? triageByDraftId.get(item.id)
                              : undefined
                          }
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
                          </Button>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>

              {/* Sticky confirm dock */}
              <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500">
                    {canOpenConfirm ? (
                      <span className="font-semibold text-emerald-700">
                        {triageSummary.neu} create · {triageSummary.attach}{" "}
                        attach · {triageSummary.skip} skip
                      </span>
                    ) : !draft.length ? (
                      "Load JSON to continue"
                    ) : !categoryReady ? (
                      <span className="font-semibold text-amber-700">
                        Select a category to run dedupe
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700">
                        Fix or remove invalid rows
                      </span>
                    )}
                  </p>
                  <Button
                    onClick={requestConfirm}
                    disabled={!canOpenConfirm}
                    className="h-9 min-w-40"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Confirm import…
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reference — collapsed by default */}
      <details className="group rounded-2xl border border-slate-200 bg-white open:shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-slate-400" />
            Sample JSON & AI prompt
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="text-xs text-slate-500">
            Hand this shape to an AI extractor, or use{" "}
            <strong className="text-slate-700">Try sample</strong> above.
          </p>
          <pre className="max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
            {SAMPLE_JSON}
          </pre>
          <details className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">
              Full AI prompt
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
              {AI_QUESTION_EXTRACT_PROMPT}
            </pre>
          </details>
        </div>
      </details>

      <Dialog
        open={Boolean(editingRow)}
        onOpenChange={(o) => !o && setEditId(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
            <DialogDescription>
              Applies to this batch only — DB write happens after confirm.
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Confirm import
            </DialogTitle>
            <DialogDescription>
              Creates questions in the database. Check the category once more.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Batch size</span>
              <span className="font-bold text-slate-900">
                {validRows.length}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-emerald-700">🟢 New</span>
              <span className="font-bold text-slate-900">
                {triageSummary.neu}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-sky-700">🔵 Attach tags</span>
              <span className="font-bold text-slate-900">
                {triageSummary.attach}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-amber-700">🟡 Skip</span>
              <span className="font-bold text-slate-900">
                {triageSummary.skip}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-t border-slate-200 pt-2">
              <span className="text-slate-500">Fallback category</span>
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

function TriageBadge({ kind }: { kind: TriageKind }) {
  if (kind === "new") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        🟢 New
      </span>
    );
  }
  if (kind === "duplicate_attach") {
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
        🔵 Duplicate · Attach
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
      🟡 Duplicate · Skip
    </span>
  );
}

function QuestionPreviewCard({
  index,
  q,
  triage,
  onEdit,
  onDelete,
}: {
  index: number;
  q: ImportQuestion;
  triage?: TriageItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            #{index + 1}
          </span>
          {triage ? (
            <TriageBadge kind={triage.kind} />
          ) : (
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              Select category…
            </span>
          )}
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">
            {q.type}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            {q.difficulty}
          </span>
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
      {triage && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {triage.kind === "new" && (
            <>
              Will create
              {triage.categoryIdsToWrite.length
                ? ` · banks: ${triage.categoryIdsToWrite.length}`
                : ""}
              {triage.tagsToWrite.length
                ? ` · tags: ${triage.tagsToWrite.join(", ")}`
                : ""}
              {q.primaryCategory ? ` · primary: ${q.primaryCategory}` : ""}
            </>
          )}
          {triage.kind === "duplicate_attach" && (
            <>
              Exists
              {triage.existingCategoryName
                ? ` in ${triage.existingCategoryName}`
                : ""}
              {triage.categoryIdsToWrite.length
                ? ` · +${triage.categoryIdsToWrite.length} bank(s)`
                : ""}
              {triage.tagsToWrite.length
                ? ` · tags: ${triage.tagsToWrite.join(", ")}`
                : ""}
            </>
          )}
          {triage.kind === "duplicate_skip" && (
            <>
              Exact match
              {triage.existingCategoryName
                ? ` (${triage.existingCategoryName})`
                : ""}
              {" · "}
              no new banks/tags
            </>
          )}
        </p>
      )}
      <ol className="mt-2 grid gap-1 sm:grid-cols-2">
        {q.content.en.options.map((opt, i) => {
          const correct = i === q.correctIndex;
          return (
            <li
              key={i}
              className={[
                "rounded-lg border px-2 py-1.5 text-[11px]",
                correct
                  ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-900"
                  : "border-slate-100 bg-slate-50 text-slate-600",
              ].join(" ")}
            >
              <span className="font-bold text-slate-400">{i + 1}.</span> {opt}
              <span className="mt-0.5 block font-normal text-slate-500" dir="rtl">
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
  const [correctIndex, setCorrectIndex] = useState(
    String(initial.correctIndex),
  );
  const [enText, setEnText] = useState(initial.content.en.text);
  const [faText, setFaText] = useState(initial.content.fa.text);
  const [enOpts, setEnOpts] = useState([...initial.content.en.options]);
  const [faOpts, setFaOpts] = useState([...initial.content.fa.options]);
  const [expEn, setExpEn] = useState(initial.explanation?.en ?? "");
  const [expFa, setExpFa] = useState(initial.explanation?.fa ?? "");
  const [tagStr, setTagStr] = useState((initial.tags ?? []).join(", "));
  const [primaryCategory, setPrimaryCategory] = useState(
    initial.primaryCategory ?? "",
  );
  const [alsoInStr, setAlsoInStr] = useState(
    (initial.alsoIn ?? []).join(", "),
  );

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
          options: enOpts.map((o) => o.trim()) as [
            string,
            string,
            string,
            string,
          ],
        },
        fa: {
          ...initial.content.fa,
          text: faText,
          options: faOpts.map((o) => o.trim()) as [
            string,
            string,
            string,
            string,
          ],
        },
      },
      explanation:
        expEn.trim() || expFa.trim()
          ? { en: expEn, fa: expFa }
          : (initial.explanation ?? null),
      tags: tagStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      primaryCategory: primaryCategory.trim() || null,
      alsoIn: alsoInStr
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
          <div
            key={i}
            className="space-y-1 rounded-lg border border-slate-100 p-2"
          >
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
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">primaryCategory</Label>
          <Input
            value={primaryCategory}
            onChange={(e) => setPrimaryCategory(e.target.value)}
            placeholder="world-cup"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">alsoIn (buckets)</Label>
          <Input
            value={alsoInStr}
            onChange={(e) => setAlsoInStr(e.target.value)}
            placeholder="ucl, real-madrid"
          />
        </div>
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
