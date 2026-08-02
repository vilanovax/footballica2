"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  buildFacility,
  collectFacilities,
  upgradeFacility,
  upgradeVault,
  withdrawVault,
} from "@/actions/club/business";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type BusinessPanelProps = {
  club: ClubSnapshot;
  onClubUpdate: (club: ClubSnapshot) => void;
};

const FACILITY_META: Record<
  BusinessFacilityKey,
  { icon: string; nameKey: string }
> = {
  TICKET_OFFICE: { icon: "🎫", nameKey: "club.biz.ticketOffice" },
  CLUB_SHOP: { icon: "🛍️", nameKey: "club.biz.clubShop" },
  MUSEUM: { icon: "🏆", nameKey: "club.biz.museum" },
};

function formatDuration(ms: number, locale: "en" | "fa"): string {
  if (ms <= 0) return "—";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) {
    return locale === "fa"
      ? `${toLocaleDigits(m, locale)} د`
      : `${m}m`;
  }
  return locale === "fa"
    ? `${toLocaleDigits(h, locale)} س ${toLocaleDigits(m, locale)} د`
    : `${h}h ${m}m`;
}

export function BusinessPanel({ club, onClubUpdate }: BusinessPanelProps) {
  const { t, locale } = useTranslation();
  const biz = club.business;
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function run(
    label: string,
    action: () => Promise<{ ok: true; club: ClubSnapshot; transferred?: number } | { ok: false; error: string }>,
    okMsg?: (transferred?: number) => string,
  ) {
    setBusy(label);
    startTransition(async () => {
      const res = await action();
      setBusy(null);
      if (!res.ok) {
        toast.error(res.error);
        haptic(HAPTIC.miss);
        return;
      }
      onClubUpdate(res.club);
      playSound("upgrade");
      haptic(HAPTIC.tap);
      if (okMsg) toast.success(okMsg(res.transferred));
    });
  }

  const primaryCollect = biz.collectableTotal > 0;
  const vaultHigh = biz.vaultFillRatio >= 0.8 && biz.vaultBalance > 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">
          {t("club.biz.title")}
        </h2>
        <div className="flex items-center gap-2 font-display text-xs font-bold">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-800">
            {t("club.biz.funds")}{" "}
            {toLocaleDigits(biz.clubFunds, locale)}
          </span>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-900">
            {t("club.biz.vault")}{" "}
            {toLocaleDigits(biz.vaultBalance, locale)}/
            {toLocaleDigits(biz.vaultCap, locale)}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("club.biz.rateLine", {
          rate: toLocaleDigits(biz.totalRatePerHour, locale),
          eta: formatDuration(biz.msUntilVaultFull, locale),
        })}
      </p>

      {/* Smart CTA row */}
      <div className="flex flex-col gap-2">
        {primaryCollect && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                "collect",
                () => collectFacilities("ALL"),
                (n) =>
                  t("club.biz.collected", {
                    n: toLocaleDigits(n ?? 0, locale),
                  }),
              )
            }
            className="btn-fantasy btn-fantasy-primary w-full"
          >
            {busy === "collect"
              ? "…"
              : t("club.biz.collectAll", {
                  n: toLocaleDigits(biz.collectableTotal, locale),
                })}
          </button>
        )}
        {(vaultHigh || (!primaryCollect && biz.vaultBalance > 0)) && (
          <button
            type="button"
            disabled={pending || biz.vaultBalance <= 0}
            onClick={() =>
              run("withdraw", () => withdrawVault(), () =>
                t("club.biz.withdrawn"),
              )
            }
            className={[
              "flex min-h-touch w-full items-center justify-center rounded-bubble border-2 px-4 py-3 font-display text-sm font-bold transition-transform active:scale-[0.98]",
              vaultHigh
                ? "border-amber-400 bg-amber-50 text-amber-950"
                : "border-border bg-surface text-foreground",
            ].join(" ")}
          >
            {busy === "withdraw"
              ? "…"
              : t("club.biz.withdraw", {
                  n: toLocaleDigits(biz.vaultBalance, locale),
                })}
          </button>
        )}
        {biz.vaultFillRatio >= 1 && (
          <p className="text-center text-[11px] font-medium text-amber-800">
            {t("club.biz.vaultFull")}
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {biz.facilities.map((f) => {
          const meta = FACILITY_META[f.key];
          return (
            <li
              key={f.key}
              className="rounded-2xl border border-border bg-surface px-3 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-foreground">
                    <span aria-hidden>{meta.icon} </span>
                    {t(meta.nameKey)}
                    {f.status === "BUILT" && (
                      <span className="ms-1 text-muted-foreground">
                        · {t("club.biz.level", {
                          n: toLocaleDigits(f.level, locale),
                        })}
                      </span>
                    )}
                  </p>
                  {f.status === "LOCKED" && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("club.biz.unlockAt", {
                        n: toLocaleDigits(f.unlockPlayerLevel, locale),
                      })}
                    </p>
                  )}
                  {f.status === "BUILT" && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("club.biz.readyLine", {
                        ready: toLocaleDigits(f.storedAmount, locale),
                        rate: toLocaleDigits(f.ratePerHour, locale),
                        eta: formatDuration(f.msUntilFull, locale),
                      })}
                    </p>
                  )}
                  {f.status === "AVAILABLE" && (
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      {t("club.biz.readyToBuild")}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  {f.status === "AVAILABLE" && f.buildCost !== null && (
                    <button
                      type="button"
                      disabled={pending || !f.canBuild}
                      onClick={() =>
                        run(`build-${f.key}`, () => buildFacility(f.key), () =>
                          t("club.biz.built"),
                        )
                      }
                      className="rounded-bubble bg-secondary px-3 py-2 font-display text-xs font-bold text-secondary-foreground disabled:opacity-40"
                    >
                      {f.buildCost === 0
                        ? t("club.biz.buildFree")
                        : t("club.biz.build", {
                            n: toLocaleDigits(f.buildCost, locale),
                          })}
                    </button>
                  )}
                  {f.status === "BUILT" && f.upgradeCost !== null && (
                    <button
                      type="button"
                      disabled={pending || !f.canUpgrade}
                      onClick={() =>
                        run(
                          `up-${f.key}`,
                          () => upgradeFacility(f.key),
                          () => t("club.biz.upgraded"),
                        )
                      }
                      className="rounded-bubble border border-border bg-muted/40 px-3 py-2 font-display text-xs font-bold text-foreground disabled:opacity-40"
                    >
                      {t("club.biz.upgrade", {
                        n: toLocaleDigits(f.upgradeCost, locale),
                      })}
                    </button>
                  )}
                  {f.status === "BUILT" && f.upgradeCost === null && (
                    <span className="rounded-full bg-muted px-2 py-1 text-center text-[10px] font-bold text-muted-foreground">
                      MAX
                    </span>
                  )}
                </div>
              </div>

              {f.status === "BUILT" && f.storageCap > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={false}
                    animate={{ width: `${Math.round(f.fillRatio * 100)}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {biz.vaultUpgradeCost !== null && (
        <button
          type="button"
          disabled={
            pending ||
            biz.clubFunds < biz.vaultUpgradeCost
          }
          onClick={() =>
            run("vault", () => upgradeVault(), () => t("club.biz.vaultUpgraded"))
          }
          className="flex min-h-touch w-full items-center justify-between rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 font-display text-sm font-bold text-foreground disabled:opacity-40"
        >
          <span>
            {t("club.biz.upgradeVault", {
              n: toLocaleDigits(biz.vaultLevel, locale),
            })}
          </span>
          <span className="text-emerald-800">
            {toLocaleDigits(biz.vaultUpgradeCost, locale)}{" "}
            {t("club.biz.funds")}
          </span>
        </button>
      )}
    </section>
  );
}
