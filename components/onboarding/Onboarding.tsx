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
import { KeysHandoff } from "@/components/onboarding/KeysHandoff";
import { GameCta, GamePanel, GameTile } from "@/components/ui/game";
import { CLUB_NAME_MAX_LEN } from "@/lib/auth/blacklist";

type Step = "avatar" | "keys" | "color" | "flag" | "name";

const FREE_FLAGS = CLUB_FLAGS.filter((f) => !f.premium);

const STEP_ORDER: Step[] = ["avatar", "keys", "color", "flag", "name"];

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
    window.setTimeout(() => setStep("keys"), 420);
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
  const keysLine =
    avatar && (locale === "fa" ? avatar.faKeysDialog : avatar.keysDialog);
  const nameLine =
    avatar && (locale === "fa" ? avatar.faDialog : avatar.dialog);

  function headerCopy(): { eyebrow: string; title: string } {
    switch (step) {
      case "avatar":
        return {
          eyebrow: t("onboarding.chooseManager"),
          title: t("onboarding.whichManager"),
        };
      case "keys":
        return {
          eyebrow: t("onboarding.keysEyebrow"),
          title: t("onboarding.keysTitle"),
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
    <section className="flex flex-1 flex-col gap-5 pt-3">
      <header className="text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-amber-300">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white">
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
                  ? "w-6 bg-amber-400"
                  : i < stepIndex
                    ? "w-3 bg-amber-400/55"
                    : "w-3 bg-white/15",
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
            className="flex flex-col gap-2.5"
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
                    scale: isSelected ? 1.02 : dim ? 0.97 : 1,
                    opacity: dim ? 0.45 : 1,
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-start"
                >
                  <GameTile
                    tone={isSelected ? "amber" : "emerald"}
                    className={[
                      "flex min-h-touch w-full items-center gap-3 p-3",
                      isSelected ? "ring-2 ring-amber-300/50" : "",
                    ].join(" ")}
                  >
                    <AvatarImage
                      avatarKey={a.key}
                      className="h-14 w-14 shrink-0 rounded-xl"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-bold text-white">
                        {t(`avatars.${a.key}.name`)}
                      </span>
                      <span className="mt-0.5 block truncate font-body text-xs font-semibold text-white/65">
                        {t(`avatars.${a.key}.tagline`)}
                      </span>
                    </span>
                  </GameTile>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {step === "keys" && selected && avatar && (
          <motion.div
            key="keys"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <KeysHandoff
              avatarKey={selected}
              managerName={t(`avatars.${selected}.name`)}
              line={keysLine || t("onboarding.keysLine")}
              acceptLabel={t("onboarding.acceptKeys")}
              backLabel={t("onboarding.back")}
              onAccept={() => goTo("color")}
              onBack={() => goTo("avatar")}
            />
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
            <p className="text-center font-body text-sm font-semibold text-white/65">
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
                      "relative flex min-h-touch flex-col items-center gap-1 rounded-2xl p-2 ring-1 transition-colors",
                      isSelected
                        ? "bg-white/15 ring-amber-300/60"
                        : "bg-white/5 ring-white/10",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className="h-10 w-10 rounded-full shadow-md ring-2 ring-black/20"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="line-clamp-1 text-center font-display text-[10px] font-bold text-white/90">
                      {locale === "fa" ? c.faName : c.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <GameCta variant="accent" block onClick={() => goTo("flag")}>
                {t("onboarding.next")}
              </GameCta>
              <button
                type="button"
                onClick={() => goTo("keys")}
                className="min-h-touch font-display text-sm font-bold text-white/55"
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
            <p className="text-center font-body text-sm font-semibold text-white/65">
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
                      "relative flex min-h-touch flex-col items-center gap-1 rounded-2xl p-2 ring-1 transition-colors",
                      isSelected
                        ? "bg-emerald-400/15 ring-emerald-300/50"
                        : "bg-white/5 ring-white/10",
                    ].join(" ")}
                  >
                    <span className="text-3xl" aria-hidden>
                      {f.emoji}
                    </span>
                    <span className="line-clamp-1 text-center font-display text-[10px] font-bold text-white/90">
                      {locale === "fa" ? f.faName : f.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <GameCta variant="accent" block onClick={() => goTo("name")}>
                {t("onboarding.next")}
              </GameCta>
              <button
                type="button"
                onClick={() => goTo("color")}
                className="min-h-touch font-display text-sm font-bold text-white/55"
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
            <GamePanel tone="emerald" className="p-3">
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
                      className="h-16 w-16 rounded-xl shadow-md"
                    />
                  )}
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="min-w-0 flex-1"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-3 w-3 rounded-full ring-2 ring-white/20"
                      style={{
                        backgroundColor: CLUB_COLORS.find(
                          (c) => c.key === colorKey,
                        )?.hex,
                      }}
                    />
                    <span className="text-lg" aria-hidden>
                      {FREE_FLAGS.find((f) => f.key === flag)?.emoji}
                    </span>
                  </div>
                  <p className="font-body text-sm font-bold leading-snug text-white/90">
                    {nameLine || t("onboarding.dialog")}
                  </p>
                </motion.div>
              </div>
            </GamePanel>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("onboarding.placeholder")}
                maxLength={CLUB_NAME_MAX_LEN}
                autoFocus
                className="min-h-touch w-full rounded-2xl border-2 border-amber-400/50 bg-black/35 px-4 py-3 text-center font-display text-lg font-bold text-white shadow-[0_0_24px_rgba(251,191,36,0.15)] outline-none placeholder:text-white/35 focus:border-amber-300"
              />
              {error && (
                <p className="text-center font-display text-xs font-bold text-rose-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <GameCta
                variant="accent"
                block
                onClick={handleStart}
                disabled={pending || name.trim().length < 2}
                className={
                  pending || name.trim().length < 2 ? "opacity-50" : undefined
                }
              >
                {pending ? "…" : t("onboarding.start")}
              </GameCta>
              <button
                type="button"
                onClick={() => goTo("flag")}
                className="min-h-touch font-display text-sm font-bold text-white/55"
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
