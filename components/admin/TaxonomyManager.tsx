"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import {
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  createTag,
  updateTag,
  deleteTag,
} from "@/actions/admin/taxonomy";
import { slugify } from "@/lib/admin/taxonomySchema";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CategoryRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  icon: string | null;
  isActive: boolean;
  count: number;
};

export type TagRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  count: number;
};

// ─── Category create/edit dialog ─────────────────────────────────────────────

function CategoryFormDialog({
  category,
  trigger,
}: {
  category?: CategoryRow;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [nameEn, setNameEn] = useState(category?.nameEn ?? "");
  const [nameFa, setNameFa] = useState(category?.nameFa ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNameEn(category?.nameEn ?? "");
      setNameFa(category?.nameFa ?? "");
      setIcon(category?.icon ?? "");
      setSlug(category?.slug ?? "");
      setSlugTouched(isEdit);
    }
  }

  const effectiveSlug = slugTouched ? slug : slugify(nameEn);

  function submit() {
    start(async () => {
      const payload = {
        slug: slugify(effectiveSlug),
        nameEn: nameEn.trim(),
        nameFa: nameFa.trim(),
        icon: icon.trim() || null,
        isActive: category?.isActive ?? true,
      };
      const res = isEdit
        ? await updateCategory(category!.id, payload)
        : await createCategory(payload);
      if (res.ok) {
        toast.success(isEdit ? "Category updated." : "Category created.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="ltr" className="admin">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Bilingual bucket used to group questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>English name</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="World Cup"
              />
            </div>
            <div className="space-y-2">
              <Label>Persian name</Label>
              <Input
                dir="rtl"
                value={nameFa}
                onChange={(e) => setNameFa(e.target.value)}
                placeholder="جام جهانی"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Icon (emoji, optional)</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏆"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="world-cup"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={pending || !nameEn.trim() || !nameFa.trim()}
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tag create/edit dialog ──────────────────────────────────────────────────

function TagFormDialog({
  tag,
  trigger,
}: {
  tag?: TagRow;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(tag);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [nameEn, setNameEn] = useState(tag?.nameEn ?? "");
  const [nameFa, setNameFa] = useState(tag?.nameFa ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNameEn(tag?.nameEn ?? "");
      setNameFa(tag?.nameFa ?? "");
      setSlug(tag?.slug ?? "");
      setSlugTouched(isEdit);
    }
  }

  const effectiveSlug = slugTouched ? slug : slugify(nameEn);

  function submit() {
    start(async () => {
      const payload = {
        slug: slugify(effectiveSlug),
        nameEn: nameEn.trim(),
        nameFa: nameFa.trim(),
      };
      const res = isEdit
        ? await updateTag(tag!.id, payload)
        : await createTag(payload);
      if (res.ok) {
        toast.success(isEdit ? "Tag updated." : "Tag created.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="ltr" className="admin">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit tag" : "New tag"}</DialogTitle>
          <DialogDescription>
            Free-form label attached to questions (many-to-many).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>English name</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Nostalgia"
              />
            </div>
            <div className="space-y-2">
              <Label>Persian name</Label>
              <Input
                dir="rtl"
                value={nameFa}
                onChange={(e) => setNameFa(e.target.value)}
                placeholder="نوستالژی"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="nostalgia"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={pending || !nameEn.trim() || !nameFa.trim()}
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row action buttons ──────────────────────────────────────────────────────

/** Inline icon toggle for a category's active state (replaces text button). */
function CategoryStatusToggle({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = category.isActive;
  const label = active
    ? "Active — click to deactivate"
    : "Inactive — click to activate";

  function toggle() {
    start(async () => {
      const res = await toggleCategoryStatus(category.id, !active);
      if (res.ok) {
        toast.success(active ? "Deactivated." : "Activated.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-md p-1 transition ${
        active
          ? "text-emerald-600 hover:bg-emerald-50"
          : "text-slate-400 hover:bg-slate-100"
      }`}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : active ? (
        <ToggleRight className="h-5 w-5" />
      ) : (
        <ToggleLeft className="h-5 w-5" />
      )}
    </button>
  );
}

function CategoryActions({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    if (!confirm(`Delete category "${category.nameEn}"?`)) return;
    start(async () => {
      const res = await deleteCategory(category.id);
      if (res.ok) {
        toast.success("Category deleted.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <CategoryFormDialog
        category={category}
        trigger={
          <Button variant="ghost" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function TagActions({ tag }: { tag: TagRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    if (!confirm(`Delete tag "${tag.nameEn}"?`)) return;
    start(async () => {
      const res = await deleteTag(tag.id);
      if (res.ok) {
        toast.success("Tag deleted.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <TagFormDialog
        tag={tag}
        trigger={
          <Button variant="ghost" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Manager ─────────────────────────────────────────────────────────────────

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: CategoryRow[];
  tags: TagRow[];
}) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              Bilingual buckets that group the question bank.
            </CardDescription>
          </div>
          <CategoryFormDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New category
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No categories yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6">
                      <span className="flex items-center gap-2">
                        {c.icon && <span aria-hidden>{c.icon}</span>}
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium text-slate-700">
                            {c.nameEn}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.nameFa}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.slug}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {c.count}
                    </TableCell>
                    <TableCell>
                      <CategoryStatusToggle category={c} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <CategoryActions category={c} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Cross-cutting labels attached to questions.
            </CardDescription>
          </div>
          <TagFormDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New tag
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No tags yet. Create one, or they&rsquo;ll appear from imports.
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-6">
                      <span className="flex flex-col leading-tight">
                        <span className="font-medium text-slate-700">
                          {t.nameEn}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.nameFa}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.slug}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {t.count}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <TagActions tag={t} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
