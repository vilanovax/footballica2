"use client";

import { Landmark } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type FundsCostProps = {
  amount: number;
  /** Compact pill (default) vs plain inline. */
  variant?: "pill" | "plain";
  className?: string;
};

/**
 * Club Funds cost — Bank currency only (never coins / gems).
 */
export function FundsCost({
  amount,
  variant = "pill",
  className,
}: FundsCostProps) {
  const { t, locale } = useTranslation();
  const body = (
    <>
      <Landmark className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      <span className="tabular-nums">{toLocaleDigits(amount, locale)}</span>
      <span className="sr-only">{t("club.biz.funds")}</span>
    </>
  );

  if (variant === "plain") {
    return (
      <span
        dir="ltr"
        title={t("club.biz.funds")}
        className={["inline-flex items-center gap-1", className ?? ""].join(
          " ",
        )}
      >
        {body}
      </span>
    );
  }

  return (
    <span
      dir="ltr"
      title={t("club.biz.funds")}
      className={[
        "inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm",
        className ?? "",
      ].join(" ")}
    >
      {body}
    </span>
  );
}
