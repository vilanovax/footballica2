"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClub } from "@/actions/createClub";
import {
  STARTER_AVATARS,
  getAvatar,
  type AvatarKey,
} from "@/lib/onboarding/avatars";
import {
  CLUB_COLORS,
  DEFAULT_CLUB_COLOR_KEY,
  type ClubColorKey,
} from "@/lib/onboarding/clubColors";
import {
  CLUB_FLAGS,
  DEFAULT_FLAG_KEY,
  type FlagKey,
} from "@/lib/onboarding/flags";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { AvatarImage } from "@/components/common/AvatarImage";
import { CLUB_NAME_MAX_LEN } from "@/lib/auth/blacklist";

type Step = "avatar" | "color" | "flag" | "name";

const FREE_FLAGS = CLUB_FLAGS.filter((f) => !f.premium);

const STEP_ORDER: Step[] = ["avatar", "color", "flag", "name"];

export function Onboarding() {
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<Step>("avatar");
  const [selected, setSelected] = useState<AvatarKey | null>(null);
  const [colorKey, setColorKey] = useState<ClubColorKey>(DEFAULT_CLUB_COLOR_KEY);
  const [flag, setFlag] = useState<FlagKey>(DEFAULT_FLAG_KEY);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function goTo(next: Step) {
    playSound("click");
    haptic(HAPTIC.tap);
    setStep(next);
  }

  function chooseAvatar(key: AvatarKey) {
    playSound("click");
    haptic(HAPTIC.tap);
    setSelected(key);
    window.setTimeout(() => setStep("color"), 450);
  }

  function mapError(code: string): string {
    switch (code) {
      case "blacklisted":
        return t("onboarding.errBlacklisted");
      case "name_taken":
        return t("onboarding.errTaken");
      case "too_short":
      case "empty":
        return t("onboarding.errTooShort");
      case "too_long":
        return t("onboarding.errTooLong");
      case "invalid_flag":
        return t("onboarding.errFlag");
      default:
        return t("onboarding.errGeneric");
    }
  }

  function handleStart() {
    if (!selected || pending) return;
    setError(null);
    // Chime before server redirect; Hub also replays once via sessionStorage.
    playSound("whistle");
    haptic(HAPTIC.goal);
    try {
      sessionStorage.setItem("fb_onboard_chime", "1");
    } catch {
      /* private mode */
    }
    startTransition(async () => {
      const result = await createClub({
        avatar: selected,
        rawName: name,
        colorKey,
        flag,
      });
      if (result && !result.ok) setError(mapError(result.error));
    });
  }

  const avatar = selected ? getAvatar(selected) : null;
  const stepIndex = STEP_ORDER.indexOf(step);

  function headerCopy(): { eyebrow: string; title: string } {
    switch (step) {
      case "avatar":
        return {
          eyebrow: t("onboarding.chooseManager"),
          title: t("onboarding.whichManager"),
        };
      case "color":
        return {
          eyebrow: t("onboarding.chooseColor"),
          title: t("onboarding.pickColor"),
        };
      case "flag":
        return {
          eyebrow: t("onboarding.chooseFlag"),
          title: t("onboarding.pickFlag"),
        };
      case "name":
        return {
          eyebrow: t("onboarding.nameClub"),
          title: t("onboarding.teamName"),
        };
    }
  }

  const { eyebrow, title } = headerCopy();

  return (
    <section className="flex flex-1 flex-col gap-6 pt-4">
      <header className="text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
          {title}
        </h1>
        <div className="mx-auto mt-3 flex items-center justify-center gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <span
              key={s}
              aria-hidden
              className={[
                "h-1.5 rounded-full transition-all",
                i === stepIndex
                  ? "w-6 bg-primary"
                  : i < stepIndex
                    ? "w-3 bg-primary/50"
                    : "w-3 bg-muted",
              ].join(" ")}
            />
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === "avatar" && (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3"
          >
            {STARTER_AVATARS.map((a) => {
              const isSelected = selected === a.key;
              const dim = selected !== null && !isSelected;
              return (
                <motion.button
                  key={a.key}
                  type="button"
                  onClick={() => chooseAvatar(a.key)}
                  animate={{
                    scale: isSelected ? 1.04 : dim ? 0.96 : 1,
                    opacity: dim ? 0.5 : 1,
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={[
                    "flex min-h-touch items-center gap-4 rounded-bubble-lg border-2 bg-surface p-4 text-start shadow-fantasy",
                    isSelected
                      ? "border-primary shadow-glow"
                      : "border-border",
                  ].join(" ")}
                >
                  <AvatarImage
                    avatarKey={a.key}
                    className="h-14 w-14 shrink-0 rounded-bubble"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-bold text-surface-foreground">
                      {t(`avatars.${a.key}.name`)}
                    </span>
                    <span className="mt-0.5 block truncate font-body text-xs font-semibold text-muted-foreground">
                      {t(`avatars.${a.key}.tagline`)}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {step === "color" && (
          <motion.div
            key="color"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            <p className="text-center font-body text-sm font-semibold text-muted-foreground">
              {t("onboarding.colorHint")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {CLUB_COLORS.map((c) => {
                const isSelected = colorKey === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      playSound("click");
                      haptic(HAPTIC.tap);
                      setColorKey(c.key);
                    }}
                    aria-pressed={isSelected}
                    aria-label={locale === "fa" ? c.faName : c.name}
                    className={[
                      "relative flex min-h-touch flex-col items-center gap-1 rounded-bubble border-2 p-2 transition-colors",
                      isSelected
                        ? "border-foreground bg-muted shadow-glow"
                        : "border-border bg-surface",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className="h-10 w-10 rounded-full shadow-fantasy-sm ring-2 ring-surface"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="line-clamp-1 text-center font-display text-[10px] font-bold text-surface-foreground">
                      {locale === "fa" ? c.faName : c.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => goTo("flag")}
                className="btn-fantasy btn-fantasy-primary w-full justify-center"
              >
                {t("onboarding.next")}
              </button>
              <button
                type="button"
                onClick={() => goTo("avatar")}
                className="min-h-touch font-display text-sm font-bold text-muted-foreground"
              >
                {t("onboarding.back")}
              </button>
            </div>
          </motion.div>
        )}

        {step === "flag" && (
          <motion.div
            key="flag"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            <p className="text-center font-body text-sm font-semibold text-muted-foreground">
              {t("onboarding.flagHint")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {FREE_FLAGS.map((f) => {
                const isSelected = flag === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      playSound("click");
                      haptic(HAPTIC.tap);
                      setFlag(f.key);
                    }}
                    aria-pressed={isSelected}
                    aria-label={locale === "fa" ? f.faName : f.name}
                    className={[
                      "relative flex min-h-touch flex-col items-center gap-1 rounded-bubble border-2 p-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border bg-surface",
                    ].join(" ")}
                  >
                    <span className="text-3xl" aria-hidden>
                      {f.emoji}
                    </span>
                    <span className="line-clamp-1 text-center font-display text-[10px] font-bold text-surface-foreground">
                      {locale === "fa" ? f.faName : f.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => goTo("name")}
                className="btn-fantasy btn-fantasy-primary w-full justify-center"
              >
                {t("onboarding.next")}
              </button>
              <button
                type="button"
                onClick={() => goTo("color")}
                className="min-h-touch font-display text-sm font-bold text-muted-foreground"
              >
                {t("onboarding.back")}
              </button>
            </div>
          </motion.div>
        )}

        {step === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            <div className="flex items-start gap-3">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 15 }}
                className="shrink-0"
              >
                {avatar && (
                  <AvatarImage
                    avatarKey={avatar.key}
                    colorKey={colorKey}
                    className="h-16 w-16 rounded-bubble shadow-fantasy"
                  />
                )}
              </motion.span>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative flex-1 rounded-bubble-lg border border-border bg-surface p-3 shadow-fantasy"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full ring-2 ring-surface"
                    style={{
                      backgroundColor:
                        CLUB_COLORS.find((c) => c.key === colorKey)?.hex,
                    }}
                  />
                  <span className="text-lg" aria-hidden>
                    {FREE_FLAGS.find((f) => f.key === flag)?.emoji}
                  </span>
                </div>
                <p className="font-body text-sm font-bold text-surface-foreground">
                  {t("onboarding.dialog")}
                </p>
              </motion.div>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("onboarding.placeholder")}
                maxLength={CLUB_NAME_MAX_LEN}
                autoFocus
                className="min-h-touch w-full rounded-bubble border-2 border-primary bg-surface px-4 py-3 text-center font-display text-lg font-bold text-surface-foreground shadow-glow outline-none placeholder:text-muted-foreground focus:border-accent"
              />
              {error && (
                <p className="text-center font-display text-xs font-bold text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleStart}
                disabled={pending || name.trim().length < 2}
                className={[
                  "btn-fantasy btn-fantasy-primary w-full justify-center",
                  pending || name.trim().length < 2 ? "opacity-50" : "",
                ].join(" ")}
              >
                {pending ? "…" : t("onboarding.start")}
              </button>
              <button
                type="button"
                onClick={() => goTo("flag")}
                className="min-h-touch font-display text-sm font-bold text-muted-foreground"
              >
                {t("onboarding.back")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
