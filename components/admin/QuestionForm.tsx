"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  questionFormSchema,
  type QuestionFormValues,
} from "@/lib/admin/questionSchema";
import { createQuestion, updateQuestion } from "@/actions/admin/questions";
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
                    onValueChange={field.onChange}
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
                    </SelectContent>
                  </Select>
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

            {type === "IMAGE" && (
              <FormField
                control={form.control}
                name="mediaUrl"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Media URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image.png"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      External image link shown with the prompt.
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
