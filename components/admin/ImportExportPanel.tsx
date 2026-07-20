"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload, FileJson } from "lucide-react";
import { exportQuestions, importQuestions } from "@/actions/admin/io";
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

type Category = { id: string; nameEn: string; nameFa: string; _count: number };

const ALL = "all";

export function ImportExportPanel({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exportCat, setExportCat] = useState<string>(ALL);
  const [exporting, startExport] = useTransition();

  const [importCat, setImportCat] = useState<string>(categories[0]?.id ?? "");
  const [tags, setTags] = useState("");
  const [payload, setPayload] = useState<unknown>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<number>(0);
  const [importing, startImport] = useTransition();

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
      const json = JSON.parse(text);
      const count = Array.isArray(json)
        ? json.length
        : Array.isArray(json?.questions)
          ? json.questions.length
          : 0;
      if (count === 0) {
        toast.error("No questions found in that file.");
        setPayload(null);
        setPreview(0);
        setFileName(null);
        return;
      }
      setPayload(json);
      setPreview(count);
      setFileName(file.name);
    } catch {
      toast.error("Could not parse JSON file.");
      setPayload(null);
      setPreview(0);
      setFileName(null);
    }
  }

  function handleImport() {
    if (!payload) {
      toast.error("Choose a JSON file first.");
      return;
    }
    if (!importCat) {
      toast.error("Select a target category.");
      return;
    }
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
        toast.success(`Imported ${res.created} question(s).`);
        setPayload(null);
        setPreview(0);
        setFileName(null);
        setTags("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Export / Backup ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Backup / Export
          </CardTitle>
          <CardDescription>
            Download questions as a portable JSON file — the whole bank or a
            single category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={exportCat} onValueChange={setExportCat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nameEn} · {c.nameFa} ({c._count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Preparing…" : "Download backup"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Import / Restore ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Restore / Import
          </CardTitle>
          <CardDescription>
            Bulk-create questions from a JSON file into a category, optionally
            tagging them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target category</Label>
            <Select value={importCat} onValueChange={setImportCat}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nameEn} · {c.nameFa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags (optional, comma-separated)</Label>
            <Input
              placeholder="nostalgia, derby, worldcup"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>JSON file</Label>
            <Input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-slate-700"
            />
            {fileName && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileJson className="h-3.5 w-3.5" />
                {fileName} — {preview} question(s) ready
              </p>
            )}
          </div>

          <Button
            onClick={handleImport}
            disabled={importing || !payload}
            variant="default"
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importing…" : "Import questions"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
