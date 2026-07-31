/**
 * L1 exact-match import triage (contentHash + category M2N attach + tags).
 * Categories = game-rule banks. Tags = Live-Ops / campaigns only.
 */

import { computeContentHash } from "@/lib/admin/content";
import type { ImportQuestion } from "@/lib/admin/questionSchema";

export type TriageKind = "new" | "duplicate_skip" | "duplicate_attach";

export type TaxonomyRef = {
  id: string;
  slug: string;
  nameEn: string;
};

export type ExistingQuestionRef = {
  id: string;
  contentHash: string | null;
  categoryId: string | null;
  categoryNameEn: string | null;
  /** Category ids already linked (primary + M2N). */
  categoryIds: string[];
  tagSlugs: string[];
};

export type TriageItem = {
  index: number;
  kind: TriageKind;
  contentHash: string;
  question: ImportQuestion;
  existingId?: string;
  existingCategoryName?: string | null;
  /** Live-Ops tags to connectOrCreate. */
  tagsToWrite: string[];
  /** Category ids to ensure via QuestionCategory (incl. primary on create). */
  categoryIdsToWrite: string[];
  desiredTags: string[];
  desiredCategoryIds: string[];
  categoryIdForCreate: string;
};

export function slugifyBucket(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\u200c/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function findCategory(
  ref: string,
  categories: TaxonomyRef[],
): TaxonomyRef | null {
  const key = ref.trim().toLowerCase();
  const keySlug = slugifyBucket(ref);
  return (
    categories.find(
      (c) =>
        c.slug.toLowerCase() === key ||
        c.slug.toLowerCase() === keySlug ||
        c.nameEn.toLowerCase() === key,
    ) ?? null
  );
}

/** Tag-only resolve (never invents a Category). */
export function resolveTagSlug(
  ref: string,
  tags: TaxonomyRef[],
): string {
  const key = ref.trim().toLowerCase();
  const keySlug = slugifyBucket(ref);
  const tag =
    tags.find(
      (t) =>
        t.slug.toLowerCase() === key ||
        t.slug.toLowerCase() === keySlug ||
        t.nameEn.toLowerCase() === key,
    ) ?? null;
  if (tag) return tag.slug.toLowerCase();
  return keySlug || key.replace(/\s+/g, "-");
}

export function resolvePrimaryCategoryId(
  primary: string | null | undefined,
  fallbackCategoryId: string,
  categories: TaxonomyRef[],
): { categoryId: string; leftoverTag: string | null } {
  if (!primary?.trim()) {
    return { categoryId: fallbackCategoryId, leftoverTag: null };
  }
  const cat = findCategory(primary, categories);
  if (cat) return { categoryId: cat.id, leftoverTag: null };
  return {
    categoryId: fallbackCategoryId,
    leftoverTag: slugifyBucket(primary) || primary.trim().toLowerCase(),
  };
}

/** Resolve alsoIn → Category ids (unknown refs become tags, not fake categories). */
export function collectDesiredCategoryIds(
  q: ImportQuestion,
  primaryCategoryId: string,
  categories: TaxonomyRef[],
): { categoryIds: string[]; unresolvedAsTags: string[] } {
  const ids = new Set<string>([primaryCategoryId]);
  const unresolvedAsTags: string[] = [];
  for (const ref of q.alsoIn ?? []) {
    const cat = findCategory(ref, categories);
    if (cat) ids.add(cat.id);
    else unresolvedAsTags.push(slugifyBucket(ref) || ref.trim().toLowerCase());
  }
  return {
    categoryIds: [...ids],
    unresolvedAsTags: unresolvedAsTags.filter(Boolean),
  };
}

export function collectDesiredTagSlugs(
  q: ImportQuestion,
  globalTags: string[],
  tags: TaxonomyRef[],
  extras: string[],
): string[] {
  const fromTags = (q.tags ?? []).map((t) => resolveTagSlug(t, tags));
  const fromGlobal = globalTags.map((t) => resolveTagSlug(t, tags));
  return Array.from(
    new Set(
      [...fromGlobal, ...fromTags, ...extras]
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function hashImportQuestion(q: ImportQuestion): string {
  return computeContentHash(q.content);
}

export function buildTriageBatch(input: {
  questions: ImportQuestion[];
  fallbackCategoryId: string;
  globalTags: string[];
  categories: TaxonomyRef[];
  tags: TaxonomyRef[];
  existingByHash: Map<string, ExistingQuestionRef>;
}): TriageItem[] {
  const seenInBatch = new Map<string, ExistingQuestionRef>();

  return input.questions
    .map((question, index) => {
      const contentHash = hashImportQuestion(question);
      const { categoryId, leftoverTag } = resolvePrimaryCategoryId(
        question.primaryCategory,
        input.fallbackCategoryId,
        input.categories,
      );
      const { categoryIds, unresolvedAsTags } = collectDesiredCategoryIds(
        question,
        categoryId,
        input.categories,
      );
      const desiredTags = collectDesiredTagSlugs(
        question,
        input.globalTags,
        input.tags,
        [...(leftoverTag ? [leftoverTag] : []), ...unresolvedAsTags],
      );

      const existing =
        input.existingByHash.get(contentHash) ?? seenInBatch.get(contentHash);

      if (!existing) {
        seenInBatch.set(contentHash, {
          id: `__pending__${index}`,
          contentHash,
          categoryId,
          categoryNameEn: null,
          categoryIds: [...categoryIds],
          tagSlugs: [...desiredTags],
        });
        return {
          index,
          kind: "new" as const,
          contentHash,
          question,
          tagsToWrite: desiredTags,
          categoryIdsToWrite: categoryIds,
          desiredTags,
          desiredCategoryIds: categoryIds,
          categoryIdForCreate: categoryId,
        };
      }

      const haveTags = new Set(existing.tagSlugs.map((x) => x.toLowerCase()));
      const haveCats = new Set(existing.categoryIds);
      const missingTags = desiredTags.filter((s) => !haveTags.has(s));
      const missingCats = categoryIds.filter((id) => !haveCats.has(id));
      const hasWork = missingTags.length > 0 || missingCats.length > 0;

      if (existing.id.startsWith("__pending__")) {
        if (hasWork) {
          existing.tagSlugs = Array.from(
            new Set([...existing.tagSlugs, ...desiredTags]),
          );
          existing.categoryIds = Array.from(
            new Set([...existing.categoryIds, ...categoryIds]),
          );
        }
        return {
          index,
          kind: hasWork
            ? ("duplicate_attach" as const)
            : ("duplicate_skip" as const),
          contentHash,
          question,
          existingId: undefined,
          existingCategoryName: "this batch",
          tagsToWrite: missingTags,
          categoryIdsToWrite: missingCats,
          desiredTags,
          desiredCategoryIds: categoryIds,
          categoryIdForCreate: categoryId,
        };
      }

      if (!hasWork) {
        return {
          index,
          kind: "duplicate_skip" as const,
          contentHash,
          question,
          existingId: existing.id,
          existingCategoryName: existing.categoryNameEn,
          tagsToWrite: [],
          categoryIdsToWrite: [],
          desiredTags,
          desiredCategoryIds: categoryIds,
          categoryIdForCreate: categoryId,
        };
      }

      return {
        index,
        kind: "duplicate_attach" as const,
        contentHash,
        question,
        existingId: existing.id,
        existingCategoryName: existing.categoryNameEn,
        tagsToWrite: missingTags,
        categoryIdsToWrite: missingCats,
        desiredTags,
        desiredCategoryIds: categoryIds,
        categoryIdForCreate: categoryId,
      };
    })
    .map((item) => {
      if (item.kind !== "new") return item;
      const pending = seenInBatch.get(item.contentHash);
      if (!pending) return item;
      return {
        ...item,
        tagsToWrite: pending.tagSlugs,
        desiredTags: pending.tagSlugs,
        categoryIdsToWrite: pending.categoryIds,
        desiredCategoryIds: pending.categoryIds,
      };
    });
}
