"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

/** Mode picker for Match Day. Client-side so copy follows the active locale. */
export function PlayModes() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="pt-2">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-secondary">
          {t("play.matchDay")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          {t("play.chooseMode")}
        </h1>
      </header>

      <div className="flex flex-col gap-4">
        <Link
          href="/play/penalty"
          className="btn-fantasy btn-fantasy-secondary w-full text-start"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">{t("play.penalty")}</span>
            <span className="text-sm font-semibold opacity-80">
              {t("play.penaltyDesc")}
            </span>
          </span>
        </Link>

        <Link
          href="/play/quick"
          className="btn-fantasy btn-fantasy-primary w-full text-start"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">{t("play.quick")}</span>
            <span className="text-sm font-semibold opacity-80">
              {t("play.quickDesc")}
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
