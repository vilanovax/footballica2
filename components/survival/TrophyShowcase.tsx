"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import type { PlayChallengeCard } from "@/components/play/PremiumChallenges";

export type TrophyState = "conquered" | "unlocked" | "locked";

function trophyState(c: PlayChallengeCard): TrophyState {
  if (c.conquered) return "conquered";
  if (c.unlocked) return "unlocked";
  return "locked";
}

type TrophyShowcaseProps = {
  challenges: PlayChallengeCard[];
};

/**
 * Horizontal trophy vitrine — tap scrolls to `#challenge-{id}`.
 */
export function TrophyShowcase({ challenges }: TrophyShowcaseProps) {
  const { t, locale } = useTranslation();

  if (challenges.length === 0) return null;

  const conquered = challenges.filter((c) => c.conquered).length;
  const total = challenges.length;
  const pct = total > 0 ? Math.round((conquered / total) * 100) : 0;

  function scrollToChallenge(id: string) {
    playSound("click");
    haptic(HAPTIC.tap);
    const el = document.getElementById(`challenge-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-accent", "ring-offset-2");
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-accent", "ring-offset-2");
    }, 1200);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="px-0.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("survival.trophyShowcase")}
          </h2>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 font-display text-[10px] font-extrabold text-accent-deep">
            {t("survival.trophyPath", {
              n: toLocaleDigits(conquered, locale),
              total: toLocaleDigits(total, locale),
            })}
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={conquered}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={t("survival.trophyShowcase")}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-amber-400 to-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 font-body text-[11px] font-semibold text-muted-foreground">
          {t("survival.trophyShowcaseHint")}
        </p>
      </div>

      <div
        className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label={t("survival.trophyShowcase")}
      >
        {challenges.map((c) => {
          const state = trophyState(c);
          const title = locale === "fa" ? c.titleFa : c.titleEn;
          const emoji = c.rewardBadgeEmoji ?? "🏆";

          return (
            <button
              key={c.id}
              type="button"
              role="listitem"
              onClick={() => scrollToChallenge(c.id)}
              aria-label={`${title} — ${t(`survival.trophyState.${state}`)}`}
              className={[
                "relative flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-1.5 py-2.5 transition-transform active:scale-95",
                state === "conquered"
                  ? "border-amber-400/90 bg-linear-to-b from-amber-100 to-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                  : state === "unlocked"
                    ? "border-accent/40 bg-surface shadow-fantasy-sm"
                    : "border-slate-600/40 bg-slate-800/90",
              ].join(" ")}
            >
              <span
                className={[
                  "relative flex h-12 w-12 items-center justify-center text-3xl",
                  state === "conquered"
                    ? "drop-shadow-[0_0_8px_rgba(255,215,0,0.9)]"
                    : state === "locked"
                      ? "grayscale opacity-40"
                      : "",
                ].join(" ")}
                aria-hidden
              >
                {emoji}
                {state === "conquered" ? (
                  <span className="absolute -end-1 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                    ✓
                  </span>
                ) : null}
                {state === "locked" ? (
                  <span className="absolute -end-1 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-[9px] text-white shadow-sm ring-1 ring-white/20">
                    🔒
                  </span>
                ) : null}
              </span>
              <span
                className={[
                  "line-clamp-2 w-full text-center font-display text-[10px] font-bold leading-tight",
                  state === "locked" ? "text-slate-400" : "text-foreground",
                ].join(" ")}
              >
                {title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
