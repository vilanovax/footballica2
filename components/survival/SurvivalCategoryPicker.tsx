"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { DuelCategoryOption } from "@/lib/duel/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import {
  GameChip,
  GameCta,
  GameIconWell,
  GamePanel,
  GameTile,
} from "@/components/ui/game";

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
      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <GamePanel tone="rose" className="w-full max-w-sm p-6">
          <GameIconWell
            size="lg"
            src="/icons/target.png"
            className="mx-auto h-16 w-16"
            iconClassName="h-9 w-9"
          />
          <h1 className="mt-3 font-display text-xl font-bold text-white">
            {t("survival.noCategories")}
          </h1>
          <p className="mt-1 font-display text-sm font-bold text-white/60">
            {t("survival.noCategoriesHint")}
          </p>
          <GameCta
            variant="ghost"
            block
            className="mt-4"
            onClick={() => router.push("/play/survival")}
          >
            {t("survival.backLobby")}
          </GameCta>
        </GamePanel>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <GamePanel tone="rose" className="p-3.5 text-start">
        <div className="relative flex items-center gap-3">
          <GameIconWell
            size="md"
            src="/icons/heart.png"
            className="h-12 w-12"
            iconClassName="h-7 w-7"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-bold uppercase tracking-widest text-rose-200/70">
              {t("survival.eyebrow")}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-black text-white">
              {t("survival.pickTitle")}
            </h1>
            <p className="mt-1 font-display text-xs font-bold text-white/65">
              {challengeId
                ? t("survival.pickSubChallenge")
                : t("survival.pickSub")}
            </p>
          </div>
        </div>
      </GamePanel>

      <div className="flex flex-col gap-2.5">
        {categories.map((c, i) => {
          const name = locale === "fa" ? c.nameFa : c.nameEn;
          const best = records[c.id] ?? 0;
          const busy = pending && pendingId === c.id;
          return (
            <motion.button
              key={c.id}
              type="button"
              disabled={pending}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: i * 0.04,
                type: "spring",
                stiffness: 300,
                damping: 22,
              }}
              whileTap={{ scale: 0.98 }}
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
              className="text-start disabled:opacity-50"
            >
              <GameTile className="flex min-h-touch items-center gap-3 bg-arena/90 px-3 py-3 text-white shadow-arena-ring">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
                  {c.icon || "❤️"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold text-white">
                    {busy ? t("survival.starting") : name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <GameChip className="tabular-nums">
                      {t("survival.questions", {
                        n: toLocaleDigits(c.questionCount, locale),
                      })}
                    </GameChip>
                    {best > 0 ? (
                      <GameChip tone="amber" className="gap-1 tabular-nums">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/icons/trophy.png"
                          alt=""
                          draggable={false}
                          className="h-3 w-3 object-contain"
                        />
                        {t("survival.yourBest", {
                          n: toLocaleDigits(best, locale),
                        })}
                      </GameChip>
                    ) : null}
                  </span>
                </span>
              </GameTile>
            </motion.button>
          );
        })}
      </div>

      <GameCta
        variant="ghost"
        className="mx-auto mt-1 min-h-11 px-6"
        onClick={() => {
          playSound("click");
          haptic(HAPTIC.tap);
          router.push("/play/survival");
        }}
      >
        {t("survival.backLobby")}
      </GameCta>
    </section>
  );
}
