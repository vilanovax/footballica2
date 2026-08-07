"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Lock } from "lucide-react";
import { setClubFlag } from "@/actions/setClubFlag";
import {
  CLUB_FLAGS,
  getFlag,
  isFlagUnlocked,
  type ClubFlag,
  type FlagKey,
} from "@/lib/onboarding/flags";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  GameChip,
  GameCta,
  GameIconWell,
  GamePanel,
} from "@/components/ui/game";
import { cn } from "@/lib/utils";

type FlagPickerModalProps = {
  open: boolean;
  /** Currently equipped flag key. */
  current: FlagKey;
  /** Manager level — gates the premium crests. */
  level: number;
  onClose: () => void;
  onSaved: () => void;
};

function errorKey(code: string): string {
  switch (code) {
    case "locked_flag":
    case "invalid_flag":
      return "profile.flag.errLocked";
    default:
      return "profile.flag.errGeneric";
  }
}

function flagName(f: ClubFlag, locale: Locale): string {
  return locale === "fa" ? f.faName : f.name;
}

/**
 * Arena flag sheet — free national colours + level-gated prestige crests.
 */
export function FlagPickerModal({
  open,
  current,
  level,
  onClose,
  onSaved,
}: FlagPickerModalProps) {
  const { t, locale } = useTranslation();
  const [selected, setSelected] = useState<FlagKey>(current);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setSelected(current);
  }, [open, current]);

  const freeFlags = useMemo(
    () => CLUB_FLAGS.filter((f) => !f.premium),
    [],
  );
  const premiumFlags = useMemo(
    () => CLUB_FLAGS.filter((f) => f.premium),
    [],
  );

  const preview = getFlag(selected);
  const dirty = selected !== current;
  const previewUnlocked = isFlagUnlocked(selected, level);

  function handleSave() {
    if (pending || !dirty || !previewUnlocked) return;
    start(async () => {
      const res = await setClubFlag(selected);
      if (res.ok) {
        haptic(HAPTIC.goal);
        playSound("upgrade");
        toast.success(t("profile.flag.saved"));
        onSaved();
      } else {
        haptic(HAPTIC.miss);
        toast.error(t(errorKey(res.error)));
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      tone="dark"
      title={t("profile.flag.title")}
      subtitle={t("profile.flag.subtitle")}
      closeLabel={t("profile.flag.cancel")}
    >
      {/* Live crest preview */}
      <GamePanel
        tone={preview.premium ? "amber" : "emerald"}
        className="mb-4 p-3.5"
      >
        <div className="relative flex items-center gap-3">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/35 text-4xl shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_0_0_rgba(0,0,0,0.35)]",
              !previewUnlocked && "grayscale opacity-70",
            )}
            aria-hidden
          >
            {preview.emoji}
          </div>
          <div className="min-w-0 flex-1 text-start">
            <p className="truncate font-display text-lg font-black text-white">
              {flagName(preview, locale)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {preview.premium ? (
                <GameChip tone="amber" className="gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/crown.png"
                    alt=""
                    draggable={false}
                    className="h-3.5 w-3.5 object-contain"
                  />
                  {t("profile.flag.premiumBadge")}
                </GameChip>
              ) : (
                <GameChip tone="emerald">{t("profile.flag.freeBadge")}</GameChip>
              )}
              {selected === current ? (
                <GameChip>{t("profile.flag.equipped")}</GameChip>
              ) : null}
            </div>
          </div>
        </div>
      </GamePanel>

      {/* Free national colours */}
      <section>
        <h3 className="mb-2 font-display text-sm font-black text-arena-fg">
          {t("profile.flag.sectionFree")}
        </h3>
        <FlagGrid
          flags={freeFlags}
          selected={selected}
          level={level}
          locale={locale}
          t={t}
          onPick={setSelected}
        />
      </section>

      {/* Prestige crests */}
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-black text-arena-fg">
            {t("profile.flag.sectionPremium")}
          </h3>
          <GameChip tone="amber" className="gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/crown.png"
              alt=""
              draggable={false}
              className="h-3.5 w-3.5 object-contain"
            />
            {t("profile.flag.lvl", {
              n: toLocaleDigits(level, locale),
            })}
          </GameChip>
        </div>
        <FlagGrid
          flags={premiumFlags}
          selected={selected}
          level={level}
          locale={locale}
          t={t}
          onPick={setSelected}
        />
        <p className="mt-2.5 flex items-start gap-2 font-display text-[11px] font-bold leading-snug text-arena-muted">
          <GameIconWell
            size="sm"
            amber
            src="/icons/crown.png"
            className="mt-0.5 h-7 w-7 shrink-0"
            iconClassName="h-4 w-4"
          />
          <span className="pt-1">{t("profile.flag.premiumHint")}</span>
        </p>
      </section>

      <div className="mt-6 flex flex-col gap-2">
        <GameCta
          variant="accent"
          block
          disabled={pending || !dirty || !previewUnlocked}
          onClick={handleSave}
        >
          {pending ? "…" : t("profile.flag.save")}
        </GameCta>
        <GameCta
          variant="ghost"
          block
          disabled={pending}
          onClick={onClose}
          className="min-h-11"
        >
          {t("profile.flag.cancel")}
        </GameCta>
      </div>
    </BottomSheet>
  );
}

function FlagGrid({
  flags,
  selected,
  level,
  locale,
  t,
  onPick,
}: {
  flags: ClubFlag[];
  selected: FlagKey;
  level: number;
  locale: Locale;
  t: (k: string, vars?: Record<string, string | number>) => string;
  onPick: (key: FlagKey) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {flags.map((f) => {
        const unlocked = isFlagUnlocked(f.key, level);
        const isSelected = selected === f.key;
        const name = flagName(f, locale);

        return (
          <motion.button
            key={f.key}
            type="button"
            disabled={!unlocked}
            whileTap={unlocked ? { scale: 0.94 } : undefined}
            onClick={() => {
              if (!unlocked) return;
              playSound("click");
              haptic(HAPTIC.tap);
              onPick(f.key);
            }}
            aria-pressed={isSelected}
            aria-label={
              unlocked
                ? name
                : t("profile.flag.lvl", {
                    n: toLocaleDigits(f.unlockLevel ?? 0, locale),
                  })
            }
            className={cn(
              "relative flex aspect-square min-h-touch flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5",
              isSelected
                ? "bg-white/12"
                : unlocked
                  ? f.premium
                    ? "bg-amber-500/10"
                    : "bg-black/25"
                  : "bg-black/35 opacity-65",
            )}
            style={
              isSelected
                ? {
                    boxShadow: f.premium
                      ? "0 0 0 2px hsl(var(--arena-ring-amber)), 0 3px 0 0 rgba(0,0,0,0.4)"
                      : "0 0 0 2px hsl(var(--arena-ring)), 0 3px 0 0 rgba(0,0,0,0.4)",
                  }
                : {
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.1), 0 3px 0 0 rgba(0,0,0,0.3)",
                  }
            }
          >
            <span
              className={cn(
                "text-[1.75rem] leading-none",
                !unlocked && "grayscale",
              )}
              aria-hidden
            >
              {f.emoji}
            </span>
            <span className="line-clamp-1 w-full text-center font-display text-[10px] font-bold text-white/80">
              {unlocked
                ? name
                : t("profile.flag.lvl", {
                    n: toLocaleDigits(f.unlockLevel ?? 0, locale),
                  })}
            </span>

            {f.premium && unlocked && !isSelected ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/icons/crown.png"
                alt=""
                draggable={false}
                className="absolute -start-0.5 -top-0.5 h-4 w-4 object-contain drop-shadow"
              />
            ) : null}

            {isSelected ? (
              <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-arena-success text-white shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            ) : null}

            {!unlocked ? (
              <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]">
                <Lock className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}
