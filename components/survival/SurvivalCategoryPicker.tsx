"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { DuelCategoryOption } from "@/lib/duel/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type SurvivalCategoryPickerProps = {
  categories: DuelCategoryOption[];
  /** Optional personal bests keyed by categoryId. */
  records?: Record<string, number>;
  /** When set, picks stay inside this premium challenge. */
  challengeId?: string | null;
};

export function SurvivalCategoryPicker({
  categories,
  records = {},
  challengeId = null,
}: SurvivalCategoryPickerProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (categories.length === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl" aria-hidden>
          📚
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">
          {t("survival.noCategories")}
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t("survival.noCategoriesHint")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/play/survival")}
          className="btn-fantasy btn-fantasy-secondary"
        >
          {t("survival.backLobby")}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-5">
      <header className="text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-secondary">
          {t("survival.eyebrow")}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
          {t("survival.pickTitle")}
        </h1>
        <p className="mt-1 font-body text-sm font-semibold text-muted-foreground">
          {challengeId
            ? t("survival.pickSubChallenge")
            : t("survival.pickSub")}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {categories.map((c, i) => {
          const name = locale === "fa" ? c.nameFa : c.nameEn;
          const best = records[c.id] ?? 0;
          const busy = pending && pendingId === c.id;
          return (
            <motion.button
              key={c.id}
              type="button"
              disabled={pending}
              initial={{ y: 14 }}
              animate={{ y: 0 }}
              transition={{
                delay: i * 0.04,
                type: "spring",
                stiffness: 300,
                damping: 22,
              }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic(HAPTIC.tap);
                playSound("click");
                setPendingId(c.id);
                startTransition(() => {
                  const qs = new URLSearchParams();
                  qs.set("category", c.id);
                  if (challengeId) qs.set("challenge", challengeId);
                  router.push(`/play/survival?${qs.toString()}`);
                });
              }}
              className="flex min-h-touch items-center gap-4 rounded-bubble-lg border-2 border-border bg-surface p-4 text-start opacity-100 shadow-fantasy transition-colors active:border-secondary disabled:opacity-50"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-bubble bg-secondary/15 text-3xl">
                {c.icon || "❤️"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold text-surface-foreground">
                  {busy ? t("survival.starting") : name}
                </span>
                <span className="mt-0.5 block font-body text-xs font-semibold text-muted-foreground">
                  {t("survival.questions", {
                    n: toLocaleDigits(c.questionCount, locale),
                  })}
                  {best > 0
                    ? ` · ${t("survival.yourBest", {
                        n: toLocaleDigits(best, locale),
                      })}`
                    : ""}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          playSound("click");
          haptic(HAPTIC.tap);
          router.push("/play/survival");
        }}
        className="btn-fantasy btn-fantasy-secondary mx-auto mt-2 min-h-11 px-6 text-sm"
      >
        {t("survival.backLobby")}
      </button>
    </section>
  );
}
