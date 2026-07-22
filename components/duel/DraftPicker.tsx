"use client";

import { motion } from "framer-motion";
import type { DuelCategoryOption } from "@/lib/duel/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type DraftPickerProps = {
  options: DuelCategoryOption[];
  pending?: boolean;
  onPick: (categoryId: string) => void;
};

export function DraftPicker({ options, pending, onPick }: DraftPickerProps) {
  const { t, locale } = useTranslation();

  return (
    <section className="flex flex-1 flex-col gap-5">
      <header className="text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          {t("duel.eyebrow")}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
          {t("duel.draftTitle")}
        </h1>
        <p className="mt-1 font-body text-sm font-semibold text-muted-foreground">
          {t("duel.draftSub")}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {options.map((c, i) => {
          const name = locale === "fa" ? c.nameFa : c.nameEn;
          return (
            <motion.button
              key={c.id}
              type="button"
              disabled={pending}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 280, damping: 20 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic(HAPTIC.tap);
                playSound("click");
                onPick(c.id);
              }}
              className="flex min-h-touch items-center gap-4 rounded-bubble-lg border-2 border-border bg-surface p-4 text-start shadow-fantasy transition-colors active:border-primary disabled:opacity-50"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-bubble bg-primary/15 text-3xl">
                {c.icon || "📚"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold text-surface-foreground">
                  {name}
                </span>
                <span className="mt-0.5 block font-body text-xs font-semibold text-muted-foreground">
                  {t("duel.questions", {
                    n: toLocaleDigits(c.questionCount, locale),
                  })}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
