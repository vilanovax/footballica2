"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Plus, Trash2, Upload } from "lucide-react";
import {
  questionFormSchema,
  type QuestionFormValues,
} from "@/lib/admin/questionSchema";
import { createQuestion, updateQuestion } from "@/actions/admin/questions";
import { uploadQuestionMedia } from "@/actions/admin/uploadQuestionMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

const EMPTY_CAREER = {
  steps: [
    { name: "", logoUrl: "" },
    { name: "", logoUrl: "" },
    { name: "", logoUrl: "" },
  ],
};

const EMPTY_HL = {
  left: { name: "", imageUrl: "" },
  right: { name: "", imageUrl: "" },
  metricLabel: "",
};

type Category = { id: string; nameEn: string; nameFa: string };
type Tag = { id: string; nameEn: string; nameFa: string };

type QuestionFormProps = {
  categories: Category[];
  tags: Tag[];
  questionId?: string;
  initialValues: QuestionFormValues;
};

const OPTION_INDEXES = [0, 1, 2, 3] as const;
const LOCALES = [
  { key: "en", label: "English", dir: "ltr" as const },
  { key: "fa", label: "Persian", dir: "rtl" as const },
] as const;

export function QuestionForm({
  categories,
  tags,
  questionId,
  initialValues,
}: QuestionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(questionId);

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: initialValues,
  });

  const type = form.watch("type");
  const correctIndex = form.watch("correctIndex");
  const isTemporal = form.watch("isTemporal");

  useEffect(() => {
    seedFormatDefaults(form, type);
  }, [type, form]);

  function onSubmit(values: QuestionFormValues) {
    setServerError(null);
    startTransition(async () => {
      const res =
        isEdit && questionId
          ? await updateQuestion(questionId, values)
          : await createQuestion(values);

      if (res.ok) {
        toast.success(isEdit ? "Question updated." : "Question created.");
        router.push("/admin/questions");
        router.refresh();
      } else {
        setServerError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── General settings ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Metadata that applies to the question in every language.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      seedFormatDefaults(
                        form,
                        v as QuestionFormValues["type"],
                      );
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="CAREER_PATH">Career path</SelectItem>
                      <SelectItem value="HIGHER_LOWER">Higher / Lower</SelectItem>
                      <SelectItem value="REVEAL_IMAGE">Reveal image</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Format only — still 4 MCQ options. No new Play mode.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="IN_REVIEW">In review</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="RETIRED">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only Published questions are served in matches.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nameEn} · {c.nameFa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="correctIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct answer</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPTION_INDEXES.map((i) => (
                        <SelectItem key={i} value={String(i)}>
                          Option {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Index is shared across both languages.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(type === "IMAGE" || type === "REVEAL_IMAGE") && (
              <FormField
                control={form.control}
                name="mediaUrl"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Media</FormLabel>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <FormControl>
                        <Input
                          placeholder="https://… or /questions/…"
                          {...field}
                        />
                      </FormControl>
                      <label className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            startTransition(async () => {
                              const fd = new FormData();
                              fd.set("file", file);
                              const res = await uploadQuestionMedia(fd);
                              if (!res.ok) {
                                toast.error(
                                  res.error === "file_too_large"
                                    ? "Max 2 MB."
                                    : res.error === "unsupported_type"
                                      ? "Use PNG, JPG, or WebP."
                                      : "Upload failed.",
                                );
                                return;
                              }
                              field.onChange(res.url);
                              toast.success("Media uploaded");
                            });
                          }}
                        />
                      </label>
                    </div>
                    {field.value ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={field.value}
                        alt=""
                        className="mt-2 h-28 w-auto max-w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                      />
                    ) : null}
                    <FormDescription>
                      {type === "REVEAL_IMAGE"
                        ? "Starts heavily blurred and clears over ~10s; snaps sharp after answer."
                        : "Shown with the prompt. Prefer hosted /questions/ uploads over hotlinks."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Tags</FormLabel>
                  {tags.length === 0 ? (
                    <FormDescription>
                      No tags yet — create them in Categories &amp; Tags.
                    </FormDescription>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {tags.map((tag) => {
                        const selected = field.value.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              field.onChange(
                                selected
                                  ? field.value.filter((id) => id !== tag.id)
                                  : [...field.value, tag.id],
                              )
                            }
                          >
                            <Badge
                              variant={selected ? "default" : "outline"}
                              className="cursor-pointer select-none transition-colors"
                            >
                              {tag.nameEn}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <FormDescription>Click to toggle. Optional.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Author name or AI model (e.g. GPT-4)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provenance — who or what created this question. Optional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isTemporal"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-input accent-slate-900"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Time-sensitive answer</FormLabel>
                      <FormDescription>
                        Enable for facts that expire (e.g. &ldquo;current Real
                        Madrid coach&rdquo;). Flags the question for periodic
                        review.
                      </FormDescription>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isTemporal && (
              <FormField
                control={form.control}
                name="asOfDate"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Valid as of</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      The date this answer is accurate as of.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Bilingual content ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              Option order must match across languages — the correct index
              applies to both.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="en">
              <TabsList className="mb-4">
                {LOCALES.map((l) => (
                  <TabsTrigger key={l.key} value={l.key}>
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {LOCALES.map((l) => (
                <TabsContent
                  key={l.key}
                  value={l.key}
                  dir={l.dir}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name={`content.${l.key}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question text</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter the question…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {type === "CAREER_PATH" && (
                    <CareerPathEditor form={form} locale={l.key} />
                  )}

                  {type === "HIGHER_LOWER" && (
                    <HigherLowerEditor form={form} locale={l.key} />
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {OPTION_INDEXES.map((i) => (
                      <FormField
                        key={i}
                        control={form.control}
                        name={`content.${l.key}.options.${i}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              Option {i + 1}
                              {correctIndex === i && (
                                <Badge variant="secondary">Correct</Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder={`Option ${i + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explanation (Did you know?)</CardTitle>
            <CardDescription>
              Optional trivia fact shown after the answer is revealed. Keep it
              short — one or two lines.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="explanation.en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      placeholder="e.g. Argentina lifted the trophy in Qatar 2022…"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="explanation.fa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persian</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      dir="rtl"
                      placeholder="مثلاً: آرژانتین جام را در قطر ۲۰۲۲ بالا برد…"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {serverError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {serverError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create question"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/questions")}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

function seedFormatDefaults(
  form: UseFormReturn<QuestionFormValues>,
  type: QuestionFormValues["type"],
) {
  if (type === "CAREER_PATH") {
    for (const locale of ["en", "fa"] as const) {
      const cur = form.getValues(`content.${locale}.careerPath`);
      if (!cur?.steps?.length) {
        form.setValue(`content.${locale}.careerPath`, structuredClone(EMPTY_CAREER));
      }
    }
  }
  if (type === "HIGHER_LOWER") {
    for (const locale of ["en", "fa"] as const) {
      const cur = form.getValues(`content.${locale}.higherLower`);
      if (!cur?.left?.name && !cur?.right?.name && !cur?.metricLabel) {
        form.setValue(`content.${locale}.higherLower`, structuredClone(EMPTY_HL));
      }
    }
  }
}

function CareerPathEditor({
  form,
  locale,
}: {
  form: UseFormReturn<QuestionFormValues>;
  locale: "en" | "fa";
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `content.${locale}.careerPath.steps`,
  });

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Career path</p>
          <p className="text-xs text-muted-foreground">
            Ordered stops shown above the options (min 2).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", logoUrl: "" })}
        >
          <Plus className="me-1 h-3.5 w-3.5" />
          Stop
        </Button>
      </div>
      <div className="space-y-3">
        {fields.map((field, i) => (
          <div
            key={field.id}
            className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2"
          >
            <span className="pb-2 font-mono text-xs text-muted-foreground">
              {i + 1}
            </span>
            <FormField
              control={form.control}
              name={`content.${locale}.careerPath.steps.${i}.name`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs">Club / stop</FormLabel>
                  <FormControl>
                    <Input placeholder="Club name" {...f} value={f.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`content.${locale}.careerPath.steps.${i}.logoUrl`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs">Logo URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="optional"
                      {...f}
                      value={f.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 shrink-0"
              disabled={fields.length <= 2}
              onClick={() => remove(i)}
              aria-label="Remove stop"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HigherLowerEditor({
  form,
  locale,
}: {
  form: UseFormReturn<QuestionFormValues>;
  locale: "en" | "fa";
}) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">Higher / Lower</p>
        <p className="text-xs text-muted-foreground">
          Two entities + metric. Options should name who is higher (or both /
          equal if needed).
        </p>
      </div>
      <FormField
        control={form.control}
        name={`content.${locale}.higherLower.metricLabel`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Metric label</FormLabel>
            <FormControl>
              <Input
                placeholder={
                  locale === "fa" ? "مثلاً گل‌های ملی" : "e.g. Career goals"
                }
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["left", "right"] as const).map((side) => (
          <div key={side} className="space-y-2 rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {side}
            </p>
            <FormField
              control={form.control}
              name={`content.${locale}.higherLower.${side}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`content.${locale}.higherLower.${side}.imageUrl`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="optional"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
