"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { sendOtp, verifyOtp } from "@/actions/auth";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type Step = "phone" | "otp";

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Avoid locale hydration mismatch (SSR default en vs persisted fa).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="text-5xl" aria-hidden>
          ⚽️
        </div>
      </section>
    );
  }

  function mapError(code: string): string {
    switch (code) {
      case "invalid_phone":
        return t("auth.errPhone");
      case "invalid_otp":
        return t("auth.errOtp");
      default:
        return t("auth.errGeneric");
    }
  }

  function handleSend() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await sendOtp(phone);
      if (!result.ok) {
        setError(mapError(result.error));
        return;
      }
      haptic(HAPTIC.tap);
      playSound("click");
      setStep("otp");
    });
  }

  function handleVerify() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp(phone, otp);
      if (!result.ok) {
        setError(mapError(result.error));
        return;
      }
      haptic(HAPTIC.goal);
      playSound("whistle");
      router.replace(result.status === "NEW" ? "/onboarding" : "/club");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-1 flex-col justify-center gap-6 px-1">
      <header className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-b from-primary/30 to-primary/5 text-4xl shadow-fantasy"
          aria-hidden
        >
          ⚽️
        </motion.div>
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          {t("auth.eyebrow")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          {step === "phone" ? t("auth.titlePhone") : t("auth.titleOtp")}
        </h1>
        <p className="mt-2 font-body text-sm font-semibold text-muted-foreground">
          {step === "phone" ? t("auth.subPhone") : t("auth.subOtp", { phone })}
        </p>
      </header>

      <AnimatePresence mode="wait">
        {step === "phone" ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="flex flex-col gap-3"
          >
            <label className="sr-only" htmlFor="phone">
              {t("auth.phoneLabel")}
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={t("auth.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
              maxLength={11}
              dir="ltr"
              className="min-h-touch w-full rounded-bubble border-2 border-primary bg-surface px-4 py-3 text-center font-display text-xl font-bold tracking-widest text-surface-foreground shadow-glow outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-accent"
            />
            {error && (
              <p className="text-center font-display text-xs font-bold text-destructive">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={pending || phone.length < 11}
              className={[
                "btn-fantasy btn-fantasy-primary w-full justify-center",
                pending || phone.length < 11 ? "opacity-50" : "",
              ].join(" ")}
            >
              {pending ? "…" : t("auth.sendOtp")}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="flex flex-col gap-3"
          >
            <label className="sr-only" htmlFor="otp">
              {t("auth.otpLabel")}
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("auth.otpPlaceholder")}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              maxLength={6}
              dir="ltr"
              autoFocus
              className="min-h-touch w-full rounded-bubble border-2 border-accent bg-surface px-4 py-3 text-center font-display text-2xl font-bold tracking-[0.4em] text-surface-foreground shadow-glow outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary"
            />
            <p className="text-center font-body text-xs font-semibold text-muted-foreground">
              {t("auth.otpHint")}
            </p>
            {error && (
              <p className="text-center font-display text-xs font-bold text-destructive">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleVerify}
              disabled={pending || otp.length < 6}
              className={[
                "btn-fantasy btn-fantasy-primary w-full justify-center",
                pending || otp.length < 6 ? "opacity-50" : "",
              ].join(" ")}
            >
              {pending ? "…" : t("auth.verify")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setError(null);
                setStep("phone");
              }}
              className="min-h-touch font-display text-sm font-bold text-muted-foreground"
            >
              {t("auth.changePhone")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
