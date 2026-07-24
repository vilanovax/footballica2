"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { X, Check, Lock, Crown } from "lucide-react";
import { setClubFlag } from "@/actions/setClubFlag";
import {
  CLUB_FLAGS,
  isFlagUnlocked,
  type FlagKey,
} from "@/lib/onboarding/flags";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type FlagPickerModalProps = {
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

export function FlagPickerModal({
  current,
  level,
  onClose,
  onSaved,
}: FlagPickerModalProps) {
  const { t, locale } = useTranslation();
  const [selected, setSelected] = useState<FlagKey>(current);
  const [pending, start] = useTransition();

  function handleSave() {
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
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label={t("profile.flag.cancel")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 flex max-h-[88vh] w-full max-w-mobile flex-col rounded-t-bubble-lg bg-surface shadow-fantasy-lg sm:rounded-bubble-lg"
      >
        <div className="flex items-center justify-between gap-3 p-5 pb-2">
          <div>
            <h2 className="font-display text-lg font-bold text-surface-foreground">
              {t("profile.flag.title")}
            </h2>
            <p className="font-body text-xs font-semibold text-muted-foreground">
              {t("profile.flag.subtitle")}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("profile.flag.cancel")}
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <div className="grid grid-cols-4 gap-2.5">
            {CLUB_FLAGS.map((f) => {
              const unlocked = isFlagUnlocked(f.key, level);
              const isSelected = selected === f.key;
              const name = locale === "fa" ? f.faName : f.name;
              return (
                <button
                  key={f.key}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    haptic(HAPTIC.tap);
                    setSelected(f.key);
                  }}
                  aria-pressed={isSelected}
                  className={[
                    "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-bubble border-2 p-1 transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : f.premium && unlocked
                        ? "border-accent/40 bg-accent/5"
                        : "border-border bg-muted",
                    !unlocked && "opacity-60",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={["text-3xl leading-none", unlocked ? "" : "grayscale"].join(" ")}
                    aria-hidden
                  >
                    {unlocked ? f.emoji : "🔒"}
                  </span>
                  <span className="line-clamp-1 w-full text-center font-display text-[10px] font-bold text-surface-foreground">
                    {unlocked
                      ? name
                      : t("profile.flag.lvl", {
                          n: toLocaleDigits(f.unlockLevel ?? 0, locale),
                        })}
                  </span>

                  {/* Premium crown marker */}
                  {f.premium && unlocked && !isSelected && (
                    <span className="absolute -start-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-fantasy-sm">
                      <Crown className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fantasy">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  {!unlocked && (
                    <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/80 text-background">
                      <Lock className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-3 flex items-center gap-1.5 font-body text-xs font-semibold text-muted-foreground">
            <Crown className="h-3.5 w-3.5 text-accent-deep" strokeWidth={2.5} />
            {t("profile.flag.premiumHint")}
          </p>
        </div>

        <div className="flex items-center gap-3 p-5 pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={pending || selected === current}
            onClick={handleSave}
            className="btn-fantasy btn-fantasy-primary flex-1 justify-center disabled:opacity-40"
          >
            {pending ? "…" : t("profile.flag.save")}
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full px-4 py-3 font-display text-sm font-bold text-muted-foreground"
          >
            {t("profile.flag.cancel")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
