"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClub } from "@/actions/createClub";
import {
  STARTER_AVATARS,
  getAvatar,
  type AvatarKey,
} from "@/lib/onboarding/avatars";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Step = "select" | "name";

export function Onboarding() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<AvatarKey | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function chooseAvatar(key: AvatarKey) {
    setSelected(key);
    // Small beat so the glow/scale is felt before advancing.
    window.setTimeout(() => setStep("name"), 450);
  }

  function handleStart() {
    if (!selected || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createClub(selected, name);
      // Success redirects server-side; only errors return here.
      if (result && !result.ok) setError(result.error);
    });
  }

  const avatar = selected ? getAvatar(selected) : null;

  return (
    <section className="flex flex-1 flex-col gap-6 pt-4">
      <header className="text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          {step === "select"
            ? t("onboarding.chooseManager")
            : t("onboarding.nameClub")}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
          {step === "select"
            ? t("onboarding.whichManager")
            : t("onboarding.teamName")}
        </h1>
      </header>

      <AnimatePresence mode="wait">
        {step === "select" ? (
          <motion.div
            key="select"
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
                    "flex items-center gap-4 rounded-bubble-lg border-2 bg-surface p-4 text-start shadow-fantasy",
                    isSelected
                      ? "border-primary shadow-glow"
                      : "border-border",
                  ].join(" ")}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-bubble bg-muted text-3xl">
                    {a.emoji}
                  </span>
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
        ) : (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            {/* Character dialog */}
            <div className="flex items-start gap-3">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 15 }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-bubble bg-muted text-4xl shadow-fantasy"
              >
                {avatar?.emoji}
              </motion.span>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative rounded-bubble-lg border border-border bg-surface p-3 shadow-fantasy"
              >
                <p className="font-body text-sm font-bold text-surface-foreground">
                  {t("onboarding.dialog")}
                </p>
              </motion.div>
            </div>

            {/* Club name input */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("onboarding.placeholder")}
                maxLength={24}
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
                onClick={() => {
                  setSelected(null);
                  setStep("select");
                }}
                className="min-h-touch font-display text-sm font-bold text-muted-foreground"
              >
                {t("onboarding.changeManager")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
